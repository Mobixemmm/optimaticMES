import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MachineConfig } from '../entities/machine-config.entity';
import { Machine } from '../entities/machine.entity';
import { currentTenantId, tenantScope } from '../common/request-context';
import { ModulesService } from '../settings/modules.service';
import {
  PANEL_MODULES,
  SCRAP_SOURCES,
  findPanelModule,
  type PanelModuleDefinition,
  type ScrapSourceSetting,
} from './panel-modules.constants';
import {
  BulkUpdateMachineConfigDto,
  UpdateMachineConfigDto,
} from './dto/update-machine-config.dto';

// Konfiguracja maszyny po scaleniu z domyślnymi ustawieniami modułu — czyli to,
// czym panel operatorski faktycznie się rysuje.
export interface EffectiveMachineConfig {
  machineId: string;
  name: string;
  line: string | null;
  panelModules: string[];
  /** Czy maszyna ma własny wiersz, czy jedzie na domyślnych. */
  isCustomized: boolean;
  scrapSource: ScrapSourceSetting;
  scrapTag: string;
  scrapDefaultCategory: string;
}

// Kafelek z informacją, czy w ogóle wolno go dziś włączyć.
export interface AvailablePanelModule extends PanelModuleDefinition {
  /** Czy moduł nadrzędny jest włączony u klienta. */
  moduleEnabled: boolean;
  moduleLabel: string;
}

const DEFAULT_SCRAP_TAG = 'scrap_count';
const DEFAULT_SCRAP_CATEGORY = 'UNCLASSIFIED';

@Injectable()
export class MachineConfigsService {
  constructor(
    @InjectRepository(MachineConfig)
    private readonly configRepository: Repository<MachineConfig>,
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    private readonly modulesService: ModulesService,
  ) {}

  /**
   * Katalog kafelków wraz z informacją, czy moduł nadrzędny jest kupiony
   * i włączony. Panel admina pokazuje wszystkie, ale wyszarza te bez modułu —
   * ukrycie ich znaczyłoby, że nie da się zobaczyć, co jeszcze system potrafi.
   */
  async listPanelModules(): Promise<AvailablePanelModule[]> {
    const modules = await this.modulesService.listEffective();
    const byKey = new Map(modules.map((m) => [m.key, m]));

    return PANEL_MODULES.map((panel) => {
      const owner = byKey.get(panel.requiresModule);
      return {
        ...panel,
        moduleEnabled: owner?.enabled ?? false,
        moduleLabel: owner?.label ?? panel.requiresModule,
      };
    });
  }

  /** Konfiguracja wszystkich maszyn z kartoteki — lista dla panelu admina. */
  async listAll(): Promise<EffectiveMachineConfig[]> {
    const [machines, rows, defaults] = await Promise.all([
      this.machineRepository.find({
        where: { isActive: true, ...tenantScope() },
        order: { name: 'ASC' },
      }),
      this.configRepository.find({ where: tenantScope() }),
      this.defaults(),
    ]);

    const byMachineId = new Map(rows.map((row) => [row.machineId, row]));
    return machines.map((machine) =>
      this.merge(machine, byMachineId.get(machine.machineId), defaults),
    );
  }

  async getForMachine(machineId: string): Promise<EffectiveMachineConfig> {
    const [machine, row, defaults] = await Promise.all([
      this.machineRepository.findOne({
        where: { machineId, ...tenantScope() },
      }),
      this.configRepository.findOne({ where: { machineId, ...tenantScope() } }),
      this.defaults(),
    ]);

    if (!machine) {
      throw new BadRequestException(
        `Maszyna "${machineId}" nie istnieje w kartotece tego klienta`,
      );
    }
    return this.merge(machine, row ?? undefined, defaults);
  }

  async update(
    machineId: string,
    dto: UpdateMachineConfigDto,
  ): Promise<EffectiveMachineConfig> {
    // Sprawdzenie istnienia maszyny (rzuca, gdy nie ma) zanim cokolwiek zapiszemy.
    await this.getForMachine(machineId);
    await this.validate(dto);
    await this.upsert(machineId, dto);
    return this.getForMachine(machineId);
  }

  /**
   * Ta sama zmiana na wielu maszynach naraz. Przy stu stanowiskach ustawianie
   * każdego z osobna jest nie tyle uciążliwe, co niewykonalne — a to jest
   * dokładnie ten moment, w którym wdrożenie się zatrzymuje.
   */
  async bulkUpdate(dto: BulkUpdateMachineConfigDto): Promise<number> {
    await this.validate(dto);

    const machines = await this.machineRepository.find({
      where: dto.allMachines
        ? { isActive: true, ...tenantScope() }
        : { machineId: In(dto.machineIds ?? []), ...tenantScope() },
      select: { machineId: true },
    });

    if (machines.length === 0) {
      throw new BadRequestException(
        'Żadna ze wskazanych maszyn nie istnieje w kartotece tego klienta',
      );
    }

    for (const machine of machines) {
      await this.upsert(machine.machineId, dto);
    }
    return machines.length;
  }

  // --- Ingest odrzutu z telemetrii ----------------------------------------

  /** Maszyny, które mają liczyć odrzut z logów — używane przez ScrapService. */
  async machinesWithTelemetryScrap(): Promise<EffectiveMachineConfig[]> {
    const all = await this.listAll();
    return all.filter(
      (config) =>
        config.scrapSource === 'telemetry' || config.scrapSource === 'both',
    );
  }

  async readScrapCursor(
    machineId: string,
  ): Promise<{ value: number | null; at: Date | null }> {
    const row = await this.configRepository.findOne({
      where: { machineId, ...tenantScope() },
    });
    return {
      value: row?.scrapCursorValue === null || row?.scrapCursorValue === undefined
        ? null
        : Number(row.scrapCursorValue),
      at: row?.scrapCursorAt ?? null,
    };
  }

  async writeScrapCursor(
    machineId: string,
    value: number,
    at: Date,
  ): Promise<void> {
    const row = await this.findOrCreateRow(machineId);
    row.scrapCursorValue = String(value);
    row.scrapCursorAt = at;
    await this.configRepository.save(row);
  }

  // --- Wewnętrzne ----------------------------------------------------------

  private async defaults(): Promise<{
    panelModules: string[];
    scrapSource: ScrapSourceSetting;
    scrapTag: string;
    scrapDefaultCategory: string;
  }> {
    const [panelConfig, scrapConfig] = await Promise.all([
      this.modulesService.getConfig('operatorPanel'),
      this.modulesService.getConfig('scrap'),
    ]);

    const configured = panelConfig.defaultPanelModules;
    const defaultSource = panelConfig.defaultScrapSource;

    return {
      panelModules: Array.isArray(configured)
        ? configured.filter((key): key is string => typeof key === 'string')
        : [],
      scrapSource: SCRAP_SOURCES.includes(defaultSource as ScrapSourceSetting)
        ? (defaultSource as ScrapSourceSetting)
        : 'operator',
      scrapTag:
        typeof scrapConfig.defaultTelemetryTag === 'string'
          ? scrapConfig.defaultTelemetryTag
          : DEFAULT_SCRAP_TAG,
      scrapDefaultCategory:
        typeof scrapConfig.defaultTelemetryCategory === 'string'
          ? scrapConfig.defaultTelemetryCategory
          : DEFAULT_SCRAP_CATEGORY,
    };
  }

  private merge(
    machine: Machine,
    row: MachineConfig | undefined,
    defaults: Awaited<ReturnType<MachineConfigsService['defaults']>>,
  ): EffectiveMachineConfig {
    const config = row?.config ?? {};
    const source = config.scrapSource;
    const tag = config.scrapTag;
    const category = config.scrapDefaultCategory;

    return {
      machineId: machine.machineId,
      name: machine.name,
      line: machine.line,
      // null znaczy "nie ustawiano" i bierze domyślne; pusta tablica znaczy
      // "ustawiono na żaden kafelek" i musi zostać pusta.
      panelModules: row?.panelModules ?? defaults.panelModules,
      isCustomized: row !== undefined,
      scrapSource: SCRAP_SOURCES.includes(source as ScrapSourceSetting)
        ? (source as ScrapSourceSetting)
        : defaults.scrapSource,
      scrapTag: typeof tag === 'string' && tag ? tag : defaults.scrapTag,
      scrapDefaultCategory:
        typeof category === 'string' && category
          ? category
          : defaults.scrapDefaultCategory,
    };
  }

  private async validate(dto: UpdateMachineConfigDto): Promise<void> {
    if (dto.panelModules === undefined) return;

    const available = await this.listPanelModules();
    const byKey = new Map(available.map((m) => [m.key, m]));

    for (const key of dto.panelModules) {
      const panel = byKey.get(key);
      if (!panel) {
        throw new BadRequestException(
          `Nieznany kafelek panelu: ${key}. Dozwolone: ${[...byKey.keys()].join(', ')}`,
        );
      }
      // Bez tego dałoby się postawić na HMI przycisk modułu, którego klient nie
      // ma — operator klikałby w funkcję kończącą się błędem 403.
      if (!panel.moduleEnabled) {
        throw new BadRequestException(
          `Kafelek "${panel.label}" wymaga włączonego modułu "${panel.moduleLabel}"`,
        );
      }
    }
  }

  private async upsert(
    machineId: string,
    dto: UpdateMachineConfigDto,
  ): Promise<void> {
    const row = await this.findOrCreateRow(machineId);

    if (dto.panelModules !== undefined) {
      // Kolejność z rejestru, nie z kolejności klikania — panel ma wyglądać
      // tak samo na każdej maszynie, na której stoją te same kafelki.
      row.panelModules = PANEL_MODULES.filter((m) =>
        dto.panelModules!.includes(m.key),
      ).map((m) => m.key);
    }

    const config = { ...(row.config ?? {}) };
    if (dto.scrapSource !== undefined) config.scrapSource = dto.scrapSource;
    if (dto.scrapTag !== undefined) config.scrapTag = dto.scrapTag;
    if (dto.scrapDefaultCategory !== undefined) {
      config.scrapDefaultCategory = dto.scrapDefaultCategory;
    }
    row.config = config;

    await this.configRepository.save(row);
  }

  private async findOrCreateRow(machineId: string): Promise<MachineConfig> {
    const tenantId = currentTenantId();
    const existing = await this.configRepository.findOne({
      where: { machineId, tenantId },
    });
    return (
      existing ??
      this.configRepository.create({
        tenantId,
        machineId,
        panelModules: null,
        config: {},
      })
    );
  }
}

export { findPanelModule };
