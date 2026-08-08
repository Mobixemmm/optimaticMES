import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { Site } from '../entities/site.entity';
import { User } from '../entities/user.entity';
import { ModulesService } from './modules.service';
import { DEFAULT_TERMINOLOGY } from './modules.constants';
import { currentContext, currentTenantId } from '../common/request-context';

// Jeden strzał, z którego frontend buduje CAŁY interfejs: nawigację, etykiety,
// widoczność przycisków i uprawnienia. Wcześniej rolę tę pełnił
// GET /settings/feature-flags zwracający piętnaście boolean-ów — tamten kształt
// nie mógł unieść ani innej terminologii, ani ról definiowanych przez klienta.
@ApiTags('Bootstrap')
@Controller('bootstrap')
export class BootstrapController {
  constructor(
    @InjectRepository(Tenant) private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Site) private readonly siteRepository: Repository<Site>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly modulesService: ModulesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Konfiguracja UI dla bieżącego użytkownika i klienta' })
  async bootstrap(@Query('siteId') siteIdParam?: string) {
    const context = currentContext();
    const tenantId = currentTenantId();
    const siteId = siteIdParam === undefined ? undefined : Number.parseInt(siteIdParam, 10);

    const [tenant, allSites, modules, user] = await Promise.all([
      this.tenantRepository.findOne({ where: { id: tenantId } }),
      this.siteRepository.find({
        where: { tenantId, isActive: true },
        order: { name: 'ASC' },
      }),
      this.modulesService.listEffective(siteId),
      context.userId
        ? this.userRepository.findOne({ where: { id: context.userId, tenantId } })
        : Promise.resolve(null),
    ]);

    // Rola z ograniczonym zasięgiem widzi tylko swoje zakłady.
    const sites =
      context.siteScope === null
        ? allSites
        : allSites.filter((site) => context.siteScope!.includes(site.id));

    // Moduł trafia do menu tylko wtedy, gdy jest włączony u klienta ORAZ
    // użytkownik ma wymagane uprawnienie. Backend i tak sprawdza uprawnienie
    // przy każdym żądaniu (@RequirePermission) — to jest wyłącznie po to, żeby
    // nie pokazywać zakładek prowadzących do 403.
    const visibleModules = modules.filter(
      (module) =>
        module.enabled &&
        (module.requiredPermission === null ||
          context.permissions.includes(module.requiredPermission)),
    );

    return {
      tenant: tenant
        ? {
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name,
            industryPack: tenant.industryPack,
          }
        : null,
      terminology: { ...DEFAULT_TERMINOLOGY, ...(tenant?.terminology ?? {}) },
      user: user
        ? { id: user.id, email: user.email, name: user.name, role: user.role }
        : null,
      permissions: context.permissions,
      siteScope: context.siteScope,
      sites,
      modules: visibleModules,
    };
  }
}
