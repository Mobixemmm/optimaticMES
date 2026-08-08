import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';

const CACHE_TTL_MS = 60_000;

// Ustala, w imieniu którego klienta leci żądanie. Kolejność jest celowa:
// token JWT ma pierwszeństwo przed czymkolwiek, co da się podstawić nagłówkiem.
@Injectable()
export class TenantResolverService {
  private slugCache = new Map<string, { id: number; expiresAt: number }>();
  private singleTenantId: { id: number | null; expiresAt: number } = {
    id: null,
    expiresAt: 0,
  };

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async resolve(params: {
    userTenantId?: number | null;
    tenantSlugHeader?: string | null;
  }): Promise<number> {
    // 1. Zalogowany użytkownik — tenant jest w podpisanym tokenie, więc nie da
    // się go podmienić nagłówkiem z zewnątrz.
    if (params.userTenantId) {
      return params.userTenantId;
    }

    // 2. Trasy publiczne (logowanie, logowanie RFID na terminalu hali,
    // health-check) — terminal deklaruje swojego klienta nagłówkiem.
    if (params.tenantSlugHeader) {
      return this.resolveBySlug(params.tenantSlugHeader);
    }

    // 3. Wdrożenie jednoklienckie — nie ma czego rozstrzygać.
    const only = await this.resolveOnlyTenant();
    if (only !== null) {
      return only;
    }

    throw new BadRequestException(
      'Nie można ustalić klienta — podaj nagłówek X-Tenant',
    );
  }

  private async resolveBySlug(slug: string): Promise<number> {
    const normalized = slug.trim().toLowerCase();
    const cached = this.slugCache.get(normalized);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.id;
    }

    const tenant = await this.tenantRepository.findOne({
      where: { slug: normalized, isActive: true },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Nieznany klient: ${slug}`);
    }

    this.slugCache.set(normalized, {
      id: tenant.id,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return tenant.id;
  }

  private async resolveOnlyTenant(): Promise<number | null> {
    if (this.singleTenantId.expiresAt > Date.now()) {
      return this.singleTenantId.id;
    }

    const tenants = await this.tenantRepository.find({
      where: { isActive: true },
      select: { id: true },
      take: 2,
    });
    const id = tenants.length === 1 ? tenants[0].id : null;
    this.singleTenantId = { id, expiresAt: Date.now() + CACHE_TTL_MS };
    return id;
  }

  invalidate(): void {
    this.slugCache.clear();
    this.singleTenantId = { id: null, expiresAt: 0 };
  }
}
