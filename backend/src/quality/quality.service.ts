import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { tenantScope, currentTenantId } from '../common/request-context';
import {
  QualityDefect,
  DefectCode,
} from '../entities/quality-defect.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { CreateQualityDefectDto } from './dto/create-quality-defect.dto';
import { ResolveQualityDefectDto } from './dto/resolve-quality-defect.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult, paginatedResult } from '../common/dto/paginated-result';

const DEFECT_LABELS: Record<DefectCode, string> = {
  dimension: 'Wymiar poza tolerancją',
  surface: 'Wada powierzchni',
  material: 'Wada materiału',
  assembly: 'Błąd montażu',
  contamination: 'Zanieczyszczenie',
  labeling: 'Błąd oznaczenia',
  other: 'Inne',
};

const DEFECT_CODES = Object.keys(DEFECT_LABELS) as DefectCode[];

@Injectable()
export class QualityService {
  constructor(
    @InjectRepository(QualityDefect)
    private defectRepository: Repository<QualityDefect>,
    @InjectRepository(ProductionOrder)
    private orderRepository: Repository<ProductionOrder>,
  ) {}

  async findAll(
    pagination: PaginationQueryDto = {},
    orderId?: number,
  ): Promise<PaginatedResult<QualityDefect>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 50;
    const [data, total] = await this.defectRepository.findAndCount({
      where: { ...tenantScope(), ...(orderId ? { orderId } : {}) },
      order: { detectedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginatedResult(data, total, page, limit);
  }

  async findOne(id: number): Promise<QualityDefect> {
    const defect = await this.defectRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!defect) {
      throw new NotFoundException(`Karta wady o ID ${id} nie istnieje`);
    }
    return defect;
  }

  async create(dto: CreateQualityDefectDto): Promise<QualityDefect> {
    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId, ...tenantScope() },
    });
    if (!order) {
      throw new NotFoundException(`Zlecenie o ID ${dto.orderId} nie istnieje`);
    }

    // Brak od razu obciąża wskaźnik jakości; poprawka czeka na rozstrzygnięcie
    // (resolve) i dopóki trwa, nie jest liczona jako strata.
    const isScrap = dto.disposition === 'scrap';
    const now = new Date();

    const defect = this.defectRepository.create({
      tenantId: currentTenantId(),
      orderId: dto.orderId,
      machineId: dto.machineId ?? null,
      defectCode: dto.defectCode,
      quantity: dto.quantity,
      disposition: dto.disposition,
      status: isScrap ? 'scrapped' : 'open',
      detectedBy: dto.detectedBy ?? null,
      detectedAt: now,
      resolvedAt: isScrap ? now : null,
      notes: dto.notes ?? null,
    });

    const saved = await this.defectRepository.save(defect);
    await this.syncOrderScrap(dto.orderId);
    return saved;
  }

  async resolve(
    id: number,
    dto: ResolveQualityDefectDto,
  ): Promise<QualityDefect> {
    const defect = await this.findOne(id);
    if (defect.status !== 'open') {
      throw new BadRequestException(
        'Karta wady jest już rozstrzygnięta i nie można zmienić jej wyniku',
      );
    }

    defect.status = dto.outcome;
    defect.resolvedAt = new Date();
    const saved = await this.defectRepository.save(defect);
    await this.syncOrderScrap(defect.orderId);
    return saved;
  }

  async remove(id: number): Promise<void> {
    const defect = await this.findOne(id);
    const { orderId } = defect;
    await this.defectRepository.remove(defect);
    await this.syncOrderScrap(orderId);
  }

  /**
   * Pareto wad: udział poszczególnych przyczyn w łącznej liczbie wadliwych
   * sztuk. Poprawki wliczamy tylko te nieudane (status 'scrapped') — sztuka
   * uratowana nie jest stratą jakościową, choć kosztowała czas.
   */
  async pareto(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const defects = await this.defectRepository
      .createQueryBuilder('defect')
      .where('defect.tenantId = :tenantId', { tenantId: currentTenantId() })
      .andWhere('defect.detectedAt >= :since', { since })
      .getMany();

    const scrapped = defects.filter((d) => d.status === 'scrapped');
    const scrapQuantity = scrapped.reduce((sum, d) => sum + d.quantity, 0);
    const reworkedQuantity = defects
      .filter((d) => d.status === 'reworked')
      .reduce((sum, d) => sum + d.quantity, 0);
    const openQuantity = defects
      .filter((d) => d.status === 'open')
      .reduce((sum, d) => sum + d.quantity, 0);

    const byCode = DEFECT_CODES.map((code) => {
      const quantity = scrapped
        .filter((d) => d.defectCode === code)
        .reduce((sum, d) => sum + d.quantity, 0);
      return {
        code,
        label: DEFECT_LABELS[code],
        quantity,
        pct:
          scrapQuantity > 0
            ? Math.round((quantity / scrapQuantity) * 1000) / 10
            : 0,
      };
    })
      .filter((row) => row.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity);

    // Skumulowany procent — linia Pareto, po której czyta się regułę 80/20.
    let running = 0;
    const causes = byCode.map((row) => {
      running += row.pct;
      return { ...row, cumulativePct: Math.round(running * 10) / 10 };
    });

    return {
      days,
      totalDefectCards: defects.length,
      scrapQuantity,
      reworkedQuantity,
      openQuantity,
      causes,
    };
  }

  /**
   * Przepisuje `scrapQuantity` zlecenia jako sumę rozstrzygniętych braków.
   * Świadomie przeliczamy od zera zamiast dodawać różnicę: dzięki temu liczba
   * braków zawsze daje się wyprowadzić z listy kart wad, a usunięcie karty nie
   * zostawia po sobie dryfu (skasowanie ostatniej karty zeruje braki, zamiast
   * utrwalić liczbę, której nic już nie uzasadnia).
   *
   * Wołane tylko dla zleceń, na których właśnie powstała lub zmieniła się karta
   * wady — zleceń bez ani jednej karty moduł nie dotyka i tam nadal rządzi
   * ręczny PATCH /orders/:id/progress.
   */
  private async syncOrderScrap(orderId: number): Promise<void> {
    const defects = await this.defectRepository.find({
      where: { orderId, ...tenantScope() },
    });
    const scrapQuantity = defects
      .filter((d) => d.status === 'scrapped')
      .reduce((sum, d) => sum + d.quantity, 0);

    await this.orderRepository.update(
      { id: orderId, ...tenantScope() },
      { scrapQuantity },
    );
  }
}

export { DEFECT_LABELS };
