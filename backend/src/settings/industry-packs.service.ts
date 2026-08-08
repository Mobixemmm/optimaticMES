import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { Role } from '../entities/role.entity';
import { ModuleConfig } from '../entities/module-config.entity';
import { currentTenantId } from '../common/request-context';
import { ALL_PERMISSIONS } from '../auth/permissions.constants';
import { findModuleDefinition } from './modules.constants';
import { INDUSTRY_PACKS, findIndustryPack } from './industry-packs.constants';

export interface ApplyPackResult {
  pack: string;
  modulesUpdated: number;
  rolesCreated: string[];
  rolesSkipped: string[];
}

@Injectable()
export class IndustryPacksService {
  constructor(
    @InjectRepository(Tenant) private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(ModuleConfig)
    private readonly moduleRepository: Repository<ModuleConfig>,
  ) {}

  list() {
    return INDUSTRY_PACKS.map((pack) => ({
      code: pack.code,
      name: pack.name,
      description: pack.description,
      moduleCount: pack.modules.length,
      roleCount: pack.roles.length,
    }));
  }

  // Nakłada pakiet na bieżącego klienta. Świadomie NIE kasuje istniejącej
  // konfiguracji: pakiet nadpisuje to, co sam opisuje, i zostawia resztę.
  // Dzięki temu ponowne nałożenie pakietu na dostosowanym wdrożeniu nie
  // wywraca ustawień, których klient nie chciał zmieniać.
  async apply(code: string): Promise<ApplyPackResult> {
    const pack = findIndustryPack(code);
    if (!pack) {
      throw new BadRequestException(`Nieznany pakiet branżowy: ${code}`);
    }
    const tenantId = currentTenantId();

    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new BadRequestException('Klient nie istnieje');
    }
    tenant.industryPack = pack.code;
    tenant.terminology = { ...(tenant.terminology ?? {}), ...pack.terminology };
    await this.tenantRepository.save(tenant);

    let modulesUpdated = 0;
    for (const patch of pack.modules) {
      const definition = findModuleDefinition(patch.key);
      if (!definition) {
        // Pakiet opisuje moduł, którego ta wersja aplikacji nie zna — pomijamy
        // zamiast przerywać cały import.
        continue;
      }

      const existing = await this.moduleRepository.findOne({
        where: { tenantId, moduleKey: patch.key, siteId: IsNull() },
      });
      const row =
        existing ??
        this.moduleRepository.create({
          tenantId,
          siteId: null,
          moduleKey: patch.key,
          enabled: true,
          sortOrder: definition.defaultSortOrder,
          requiredPermission: definition.requiredPermission,
          config: {},
        });

      if (patch.enabled !== undefined) row.enabled = definition.core ? true : patch.enabled;
      if (patch.label !== undefined) row.label = patch.label;
      if (patch.icon !== undefined) row.icon = patch.icon;
      if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
      if (patch.config !== undefined) row.config = { ...(row.config ?? {}), ...patch.config };

      await this.moduleRepository.save(row);
      modulesUpdated++;
    }

    const rolesCreated: string[] = [];
    const rolesSkipped: string[] = [];
    for (const roleSeed of pack.roles) {
      const existing = await this.roleRepository.findOne({
        where: { tenantId, code: roleSeed.code },
      });
      if (existing) {
        // Rola o tym kodzie już istnieje — mogła zostać zmieniona przez klienta,
        // więc nadpisanie jej uprawnieniami z pakietu byłoby cichą regresją.
        rolesSkipped.push(roleSeed.code);
        continue;
      }

      const unknown = roleSeed.permissions.filter(
        (p) => !(ALL_PERMISSIONS as string[]).includes(p),
      );
      if (unknown.length > 0) {
        throw new BadRequestException(
          `Pakiet "${pack.code}", rola "${roleSeed.code}": nieznane uprawnienia ${unknown.join(', ')}`,
        );
      }

      await this.roleRepository.save(
        this.roleRepository.create({
          tenantId,
          code: roleSeed.code,
          name: roleSeed.name,
          description: roleSeed.description,
          permissions: roleSeed.permissions,
          siteScope: null,
          isSystem: false,
        }),
      );
      rolesCreated.push(roleSeed.code);
    }

    return { pack: pack.code, modulesUpdated, rolesCreated, rolesSkipped };
  }
}
