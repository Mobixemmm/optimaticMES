import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { tenantScope, currentTenantId } from '../common/request-context';
import { BomItem } from '../entities/bom-item.entity';
import { MaterialConsumption } from '../entities/material-consumption.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { CreateBomItemDto } from './dto/create-bom-item.dto';
import { UpdateBomItemDto } from './dto/update-bom-item.dto';
import { ConsumeMaterialDto } from './dto/consume-material.dto';

// Kolumny `numeric` wracają z Postgresa jako stringi. Bez tego "10" + 5 dałoby
// "105" zamiast 15 — a to są ilości materiału, nie etykiety.
function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Zaokrąglenie do 4 miejsc zbija błąd zmiennoprzecinkowy (0.1 * 3 = 0.30000000000000004)
// przy mnożeniu receptury przez wielkość zlecenia.
function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export interface MaterialRow {
  inventoryItemId: number;
  code: string;
  name: string;
  unit: string;
}

@Injectable()
export class BomService {
  constructor(
    @InjectRepository(BomItem)
    private bomRepository: Repository<BomItem>,
    @InjectRepository(MaterialConsumption)
    private consumptionRepository: Repository<MaterialConsumption>,
    @InjectRepository(InventoryItem)
    private inventoryRepository: Repository<InventoryItem>,
    @InjectRepository(ProductionOrder)
    private orderRepository: Repository<ProductionOrder>,
  ) {}

  // --- Receptura -------------------------------------------------------

  async findByProduct(productName: string): Promise<(BomItem & MaterialRow)[]> {
    const items = await this.bomRepository.find({
      where: { productName, ...tenantScope() },
      order: { id: 'ASC' },
    });
    return this.decorateWithMaterial(items);
  }

  /** Lista produktów, które w ogóle mają zdefiniowaną recepturę. */
  async listProducts(): Promise<{ productName: string; itemCount: number }[]> {
    const items = await this.bomRepository.find({ where: tenantScope() });
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.productName, (counts.get(item.productName) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([productName, itemCount]) => ({ productName, itemCount }))
      .sort((a, b) => a.productName.localeCompare(b.productName, 'pl'));
  }

  async create(dto: CreateBomItemDto): Promise<BomItem> {
    const material = await this.inventoryRepository.findOne({
      where: { id: dto.inventoryItemId, ...tenantScope() },
    });
    if (!material) {
      throw new NotFoundException(
        `Materiał o ID ${dto.inventoryItemId} nie istnieje w magazynie`,
      );
    }

    const duplicate = await this.bomRepository.findOne({
      where: {
        productName: dto.productName,
        inventoryItemId: dto.inventoryItemId,
        ...tenantScope(),
      },
    });
    if (duplicate) {
      throw new ConflictException(
        `Materiał ${material.code} jest już w recepturze produktu "${dto.productName}"`,
      );
    }

    const item = this.bomRepository.create({
      ...dto,
      notes: dto.notes ?? null,
      tenantId: currentTenantId(),
    });
    return this.bomRepository.save(item);
  }

  async update(id: number, dto: UpdateBomItemDto): Promise<BomItem> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.bomRepository.save(item);
  }

  async findOne(id: number): Promise<BomItem> {
    const item = await this.bomRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!item) {
      throw new NotFoundException(`Pozycja receptury o ID ${id} nie istnieje`);
    }
    return item;
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);
    await this.bomRepository.remove(item);
  }

  // --- Plan kontra fakt ------------------------------------------------

  /**
   * Zestawienie dla zlecenia: ile materiału przewiduje receptura, ile już
   * faktycznie wydano i czego brakuje. Materiały wydane spoza receptury
   * pokazujemy osobno — to zwykle sygnał, że ktoś podmienił surowiec i
   * właśnie takie przypadki są potem szukane przy reklamacji.
   */
  async requirementsForOrder(orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, ...tenantScope() },
    });
    if (!order) {
      throw new NotFoundException(`Zlecenie o ID ${orderId} nie istnieje`);
    }

    const bomItems = await this.bomRepository.find({
      where: { productName: order.productName, ...tenantScope() },
    });
    const consumptions = await this.consumptionRepository.find({
      where: { orderId, ...tenantScope() },
    });

    const issuedByMaterial = new Map<number, number>();
    for (const consumption of consumptions) {
      issuedByMaterial.set(
        consumption.inventoryItemId,
        (issuedByMaterial.get(consumption.inventoryItemId) ?? 0) + num(consumption.quantity),
      );
    }

    const materialIds = [
      ...new Set([
        ...bomItems.map((b) => b.inventoryItemId),
        ...consumptions.map((c) => c.inventoryItemId),
      ]),
    ];
    const materials = await this.loadMaterials(materialIds);

    const planned = bomItems.map((item) => {
      const required = round4(num(item.quantityPer) * order.quantity);
      const issued = round4(issuedByMaterial.get(item.inventoryItemId) ?? 0);
      const material = materials.get(item.inventoryItemId);
      return {
        inventoryItemId: item.inventoryItemId,
        code: material?.code ?? '—',
        name: material?.name ?? '—',
        unit: material?.unit ?? '',
        quantityPer: num(item.quantityPer),
        required,
        issued,
        remaining: round4(Math.max(0, required - issued)),
        // Wydano więcej, niż przewiduje receptura — nadzużycie surowca.
        overIssued: round4(Math.max(0, issued - required)),
      };
    });

    const plannedIds = new Set(bomItems.map((b) => b.inventoryItemId));
    const unplanned = [...issuedByMaterial.entries()]
      .filter(([materialId]) => !plannedIds.has(materialId))
      .map(([materialId, issued]) => {
        const material = materials.get(materialId);
        return {
          inventoryItemId: materialId,
          code: material?.code ?? '—',
          name: material?.name ?? '—',
          unit: material?.unit ?? '',
          issued: round4(issued),
        };
      });

    return {
      orderId,
      orderNumber: order.orderNumber,
      productName: order.productName,
      quantity: order.quantity,
      hasBom: bomItems.length > 0,
      planned,
      unplanned,
    };
  }

  // --- Wydania materiału (genealogia) ----------------------------------

  async consumptionsForOrder(
    orderId: number,
  ): Promise<(MaterialConsumption & MaterialRow)[]> {
    const consumptions = await this.consumptionRepository.find({
      where: { orderId, ...tenantScope() },
      order: { consumedAt: 'DESC' },
    });
    return this.decorateWithMaterial(consumptions);
  }

  async consume(dto: ConsumeMaterialDto): Promise<MaterialConsumption> {
    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId, ...tenantScope() },
    });
    if (!order) {
      throw new NotFoundException(`Zlecenie o ID ${dto.orderId} nie istnieje`);
    }

    const material = await this.inventoryRepository.findOne({
      where: { id: dto.inventoryItemId, ...tenantScope() },
    });
    if (!material) {
      throw new NotFoundException(
        `Materiał o ID ${dto.inventoryItemId} nie istnieje w magazynie`,
      );
    }

    // Blokujemy wydanie ponad stan zamiast pozwolić zejść poniżej zera:
    // ujemny stan magazynowy nie jest błędem, który sam się naprawia, a
    // rozjazd kartoteki poprawia się w module Magazyn.
    const stock = num(material.stock);
    if (dto.quantity > stock) {
      throw new BadRequestException(
        `Na stanie jest ${stock} ${material.unit} materiału ${material.code} — nie można wydać ${dto.quantity}`,
      );
    }

    const consumption = this.consumptionRepository.create({
      tenantId: currentTenantId(),
      orderId: dto.orderId,
      inventoryItemId: dto.inventoryItemId,
      batchNumber: dto.batchNumber,
      quantity: dto.quantity,
      consumedAt: new Date(),
      consumedBy: dto.consumedBy ?? null,
      notes: dto.notes ?? null,
    });
    const saved = await this.consumptionRepository.save(consumption);

    await this.inventoryRepository.update(
      { id: dto.inventoryItemId, ...tenantScope() },
      { stock: round4(stock - dto.quantity) },
    );

    return saved;
  }

  /** Cofnięcie wydania — materiał wraca na stan. */
  async removeConsumption(id: number): Promise<void> {
    const consumption = await this.consumptionRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!consumption) {
      throw new NotFoundException(`Wydanie materiału o ID ${id} nie istnieje`);
    }

    const material = await this.inventoryRepository.findOne({
      where: { id: consumption.inventoryItemId, ...tenantScope() },
    });

    await this.consumptionRepository.remove(consumption);

    if (material) {
      await this.inventoryRepository.update(
        { id: material.id, ...tenantScope() },
        { stock: round4(num(material.stock) + num(consumption.quantity)) },
      );
    }
  }

  // --- Pomocnicze ------------------------------------------------------

  private async loadMaterials(ids: number[]): Promise<Map<number, InventoryItem>> {
    if (ids.length === 0) return new Map();
    const materials = await this.inventoryRepository.find({
      where: { id: In(ids), ...tenantScope() },
    });
    return new Map(materials.map((m) => [m.id, m]));
  }

  // Dokleja kod/nazwę/jednostkę materiału do wierszy, żeby UI nie musiał
  // dociągać kartoteki osobnym zapytaniem na każdy wiersz.
  private async decorateWithMaterial<T extends { inventoryItemId: number }>(
    rows: T[],
  ): Promise<(T & MaterialRow)[]> {
    const materials = await this.loadMaterials(rows.map((r) => r.inventoryItemId));
    return rows.map((row) => {
      const material = materials.get(row.inventoryItemId);
      return {
        ...row,
        inventoryItemId: row.inventoryItemId,
        code: material?.code ?? '—',
        name: material?.name ?? '—',
        unit: material?.unit ?? '',
      };
    });
  }
}
