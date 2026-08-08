import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { Site } from '../entities/site.entity';
import { Area } from '../entities/area.entity';
import { Machine } from '../entities/machine.entity';
import { currentTenantId, assertSiteAllowed } from '../common/request-context';
import { TenantResolverService } from './tenant-resolver.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class TenancyService {
  constructor(
    @InjectRepository(Tenant) private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Site) private readonly siteRepository: Repository<Site>,
    @InjectRepository(Area) private readonly areaRepository: Repository<Area>,
    @InjectRepository(Machine) private readonly machineRepository: Repository<Machine>,
    private readonly tenantResolver: TenantResolverService,
  ) {}

  // --- Klient -----------------------------------------------------------
  async getTenant(): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: currentTenantId() },
    });
    if (!tenant) {
      throw new NotFoundException('Klient nie istnieje');
    }
    return tenant;
  }

  async updateTenant(dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.getTenant();
    if (dto.name !== undefined) tenant.name = dto.name;
    if (dto.terminology !== undefined) {
      // Scalanie, nie podmiana: panel admina wysyła tylko zmienione klucze,
      // a nie cały słownik.
      tenant.terminology = { ...(tenant.terminology ?? {}), ...dto.terminology };
    }
    const saved = await this.tenantRepository.save(tenant);
    this.tenantResolver.invalidate();
    return saved;
  }

  // --- Zakłady ----------------------------------------------------------
  async listSites(): Promise<Site[]> {
    return this.siteRepository.find({
      where: { tenantId: currentTenantId() },
      order: { name: 'ASC' },
    });
  }

  async createSite(dto: CreateSiteDto): Promise<Site> {
    const site = this.siteRepository.create({
      tenantId: currentTenantId(),
      code: dto.code,
      name: dto.name,
      timezone: dto.timezone ?? 'Europe/Warsaw',
    });
    return this.siteRepository.save(site);
  }

  async updateSite(id: number, dto: UpdateSiteDto): Promise<Site> {
    const site = await this.findSite(id);
    if (dto.name !== undefined) site.name = dto.name;
    if (dto.timezone !== undefined) site.timezone = dto.timezone;
    if (dto.isActive !== undefined) site.isActive = dto.isActive;
    return this.siteRepository.save(site);
  }

  async removeSite(id: number): Promise<void> {
    const site = await this.findSite(id);

    // FK z machines.site_id ma ON DELETE SET NULL, więc baza sama by na to
    // pozwoliła — ciche osierocenie maszyn byłoby jednak trudne do zauważenia.
    const machineCount = await this.machineRepository.count({
      where: { tenantId: site.tenantId, siteId: site.id },
    });
    if (machineCount > 0) {
      throw new BadRequestException(
        `Do zakładu przypisano ${machineCount} maszyn — najpierw je przenieś`,
      );
    }
    await this.siteRepository.remove(site);
  }

  private async findSite(id: number): Promise<Site> {
    const site = await this.siteRepository.findOne({
      where: { id, tenantId: currentTenantId() },
    });
    if (!site) {
      throw new NotFoundException('Zakład nie istnieje');
    }
    assertSiteAllowed(site.id);
    return site;
  }

  // --- Obszary ----------------------------------------------------------
  async listAreas(siteId?: number): Promise<Area[]> {
    const where: { tenantId: number; siteId?: number } = {
      tenantId: currentTenantId(),
    };
    if (siteId !== undefined) {
      assertSiteAllowed(siteId);
      where.siteId = siteId;
    }
    return this.areaRepository.find({ where, order: { name: 'ASC' } });
  }

  async createArea(dto: CreateAreaDto): Promise<Area> {
    await this.findSite(dto.siteId);
    if (dto.parentAreaId !== undefined && dto.parentAreaId !== null) {
      await this.findArea(dto.parentAreaId);
    }
    const area = this.areaRepository.create({
      tenantId: currentTenantId(),
      siteId: dto.siteId,
      parentAreaId: dto.parentAreaId ?? null,
      code: dto.code,
      name: dto.name,
    });
    return this.areaRepository.save(area);
  }

  async updateArea(id: number, dto: UpdateAreaDto): Promise<Area> {
    const area = await this.findArea(id);
    if (dto.name !== undefined) area.name = dto.name;
    if (dto.isActive !== undefined) area.isActive = dto.isActive;
    if (dto.parentAreaId !== undefined) {
      if (dto.parentAreaId === id) {
        throw new BadRequestException('Obszar nie może być swoim rodzicem');
      }
      if (dto.parentAreaId !== null) {
        await this.assertNoAreaCycle(id, dto.parentAreaId);
      }
      area.parentAreaId = dto.parentAreaId;
    }
    return this.areaRepository.save(area);
  }

  async removeArea(id: number): Promise<void> {
    const area = await this.findArea(id);
    const children = await this.areaRepository.count({
      where: { tenantId: area.tenantId, parentAreaId: area.id },
    });
    if (children > 0) {
      throw new BadRequestException(
        `Obszar ma ${children} podobszarów — usuń je najpierw`,
      );
    }
    await this.areaRepository.remove(area);
  }

  private async findArea(id: number): Promise<Area> {
    const area = await this.areaRepository.findOne({
      where: { id, tenantId: currentTenantId() },
    });
    if (!area) {
      throw new NotFoundException('Obszar nie istnieje');
    }
    assertSiteAllowed(area.siteId);
    return area;
  }

  // Hierarchia obszarów jest dowolnie głęboka, więc przy zmianie rodzica trzeba
  // sprawdzić, czy nowy rodzic nie jest potomkiem przenoszonego obszaru — inaczej
  // powstałby cykl, który zawiesiłby każde przejście drzewa.
  private async assertNoAreaCycle(areaId: number, nextParentId: number): Promise<void> {
    const tenantId = currentTenantId();
    const seen = new Set<number>([areaId]);
    let cursor: number | null = nextParentId;

    while (cursor !== null) {
      if (seen.has(cursor)) {
        throw new BadRequestException(
          'Taka zmiana utworzyłaby cykl w hierarchii obszarów',
        );
      }
      seen.add(cursor);
      const parent: Area | null = await this.areaRepository.findOne({
        where: { id: cursor, tenantId },
        select: { id: true, parentAreaId: true },
      });
      cursor = parent?.parentAreaId ?? null;
    }
  }
}
