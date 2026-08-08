import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ModuleConfig } from '../entities/module-config.entity';
import { currentTenantId, assertSiteAllowed } from '../common/request-context';
import {
  MODULE_DEFINITIONS,
  findModuleDefinition,
  type ModuleDefinition,
  type ModulePricing,
  type ModuleReadiness,
} from './modules.constants';
import { UpdateModulesDto } from './dto/update-modules.dto';

// Moduł tak, jak widzi go frontend: definicja z kodu scalona z konfiguracją
// z bazy. `core: true` znaczy "nie da się wyłączyć" (pulpit, ustawienia).
export interface EffectiveModule {
  key: string;
  label: string;
  icon: string;
  enabled: boolean;
  sortOrder: number;
  requiredPermission: string | null;
  core: boolean;
  pricing: ModulePricing;
  readiness: ModuleReadiness;
  config: Record<string, unknown>;
}

@Injectable()
export class ModulesService {
  constructor(
    @InjectRepository(ModuleConfig)
    private readonly moduleRepository: Repository<ModuleConfig>,
  ) {}

  // Zwraca WSZYSTKIE moduły z rejestru, także te bez wiersza w bazie. Dzięki
  // temu moduł dodany w kodzie pojawia się u klienta od razu, bez migracji —
  // brak wiersza znaczy po prostu "ustawienia domyślne".
  async listEffective(siteId?: number | null): Promise<EffectiveModule[]> {
    const tenantId = currentTenantId();
    if (siteId !== undefined && siteId !== null) {
      assertSiteAllowed(siteId);
    }

    const rows = await this.moduleRepository.find({
      where: { tenantId },
    });
    const tenantLevel = new Map(
      rows.filter((r) => r.siteId === null).map((r) => [r.moduleKey, r]),
    );
    const siteLevel = new Map(
      siteId ? rows.filter((r) => r.siteId === siteId).map((r) => [r.moduleKey, r]) : [],
    );

    return MODULE_DEFINITIONS.map((definition) =>
      this.merge(definition, tenantLevel.get(definition.key), siteLevel.get(definition.key)),
    ).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'pl'));
  }

  private merge(
    definition: ModuleDefinition,
    tenantRow?: ModuleConfig,
    siteRow?: ModuleConfig,
  ): EffectiveModule {
    // Nadpisanie per zakład wygrywa z ustawieniem globalnym klienta, a to
    // z domyślną definicją z kodu.
    const row = siteRow ?? tenantRow;
    return {
      key: definition.key,
      label: row?.label ?? definition.defaultLabel,
      icon: row?.icon ?? definition.defaultIcon,
      // Modułu oznaczonego jako core nie da się wyłączyć nawet wpisem w bazie —
      // bez pulpitu i ustawień klient odciąłby sobie drogę do panelu admina.
      //
      // Brak wiersza w bazie znaczy co innego dla modułu z pakietu niż dla
      // płatnego dodatku: pakiet jest włączony z definicji, a dodatek czeka na
      // świadomą decyzję. Inaczej dołożenie modułu do rejestru po cichu
      // podniosłoby klientowi rachunek.
      enabled: definition.core
        ? true
        : (row?.enabled ?? definition.pricing.inPackage),
      sortOrder: row?.sortOrder ?? definition.defaultSortOrder,
      requiredPermission: definition.requiredPermission,
      core: definition.core,
      pricing: definition.pricing,
      readiness: definition.readiness,
      config: {
        ...definition.defaultConfig,
        ...(tenantRow?.config ?? {}),
        ...(siteRow?.config ?? {}),
      },
    };
  }

  // Zapisuje tylko przysłane pola — panel admina wysyła zmianę jednego
  // przełącznika, a nie całą konfigurację.
  async updateMany(dto: UpdateModulesDto): Promise<EffectiveModule[]> {
    const tenantId = currentTenantId();
    const siteId = dto.siteId ?? null;
    if (siteId !== null) {
      assertSiteAllowed(siteId);
    }

    for (const patch of dto.modules) {
      const definition = findModuleDefinition(patch.key);
      if (!definition) {
        throw new BadRequestException(`Nieznany moduł: ${patch.key}`);
      }
      if (definition.core && patch.enabled === false) {
        throw new BadRequestException(
          `Moduł "${definition.defaultLabel}" jest wymagany i nie można go wyłączyć`,
        );
      }

      const existing = await this.moduleRepository.findOne({
        where: {
          tenantId,
          moduleKey: patch.key,
          siteId: siteId === null ? IsNull() : siteId,
        },
      });

      const row =
        existing ??
        this.moduleRepository.create({
          tenantId,
          siteId,
          moduleKey: patch.key,
          // Ten sam domyślny stan co przy odczycie — zmiana samej etykiety
          // płatnego dodatku nie ma prawa go przy okazji włączyć.
          enabled: definition.pricing.inPackage,
          label: null,
          icon: null,
          sortOrder: definition.defaultSortOrder,
          requiredPermission: definition.requiredPermission,
          config: {},
        });

      if (patch.enabled !== undefined) row.enabled = patch.enabled;
      if (patch.label !== undefined) row.label = patch.label;
      if (patch.icon !== undefined) row.icon = patch.icon;
      if (patch.sortOrder !== undefined) row.sortOrder = patch.sortOrder;
      if (patch.config !== undefined) {
        row.config = { ...(row.config ?? {}), ...patch.config };
      }

      await this.moduleRepository.save(row);
    }

    return this.listEffective(siteId);
  }

  // Używane przez serwisy domenowe, które muszą uszanować ustawienie modułu
  // po stronie serwera (np. czy w ogóle wolno kasować zlecenia u tego klienta).
  async getConfig(moduleKey: string): Promise<Record<string, unknown>> {
    const modules = await this.listEffective();
    return modules.find((m) => m.key === moduleKey)?.config ?? {};
  }

  async isEnabled(moduleKey: string): Promise<boolean> {
    const modules = await this.listEffective();
    return modules.find((m) => m.key === moduleKey)?.enabled ?? false;
  }
}
