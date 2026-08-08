import { PERMISSIONS } from '../auth/permissions.constants';

// Rejestr modułów: kod wie, JAKIE moduły potrafi wyrenderować, a baza
// (module_configs) decyduje KTÓRE są włączone, jak się nazywają i w jakiej
// kolejności stoją w menu. Dodanie klienta z innej branży = wiersze w bazie.
//
// Dawne feature flagi typu ALLOW_ORDER_DELETE nie znikły — zeszły poziom niżej,
// do `config` właściwego modułu (patrz defaultConfig poniżej). Dzięki temu
// ustawienie "czy wolno kasować zlecenia" stoi tam, gdzie moduł zleceń, a nie
// w płaskiej, globalnej liście piętnastu boolean-ów.
// Pozycja cennikowa modułu. Cennik jest częścią definicji, a nie osobnym
// arkuszem obok kodu, bo inaczej rozjeżdża się w tydzień: handlowiec sprzedaje
// moduł, którego nie da się włączyć, albo klient ma włączony moduł, za który
// nikt nie wystawił faktury. Tutaj jedno i drugie wynika z tego samego wiersza.
export interface ModulePricing {
  /** W pakiecie bazowym — bez dopłaty za stanowisko. */
  inPackage: boolean;
  /** Dopłata w zł miesięcznie za stanowisko. 0, gdy inPackage. */
  pricePerStation: number;
}

// Jak daleko moduł jest zbudowany. To pole istnieje po to, żeby UI mówił prawdę:
// zakładka modułu bez logiki domenowej pokazuje stan „nieskonfigurowany" i mówi,
// czego brakuje, zamiast udawać pustą listę realnych danych.
export type ModuleReadiness = 'ready' | 'preview';

export interface ModuleDefinition {
  key: string;
  defaultLabel: string;
  defaultIcon: string;
  defaultSortOrder: number;
  requiredPermission: string | null;
  // Moduły oznaczone jako `core` są zawsze widoczne — bez pulpitu i ustawień
  // klient mógłby wyłączyć sobie drogę powrotu do panelu administratora.
  core: boolean;
  pricing: ModulePricing;
  readiness: ModuleReadiness;
  defaultConfig: Record<string, unknown>;
}

// Skróty, żeby lista definicji niżej dała się czytać jednym rzutem oka.
const IN_PACKAGE: ModulePricing = { inPackage: true, pricePerStation: 0 };
const extra = (pricePerStation: number): ModulePricing => ({
  inPackage: false,
  pricePerStation,
});

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    key: 'dashboard',
    defaultLabel: 'Pulpit',
    defaultIcon: 'LayoutDashboard',
    defaultSortOrder: 10,
    requiredPermission: null,
    core: true,
    pricing: IN_PACKAGE,
    readiness: 'ready',
    defaultConfig: {
      showKpiCards: true,
      showOeeChart: true,
      showShiftTile: true,
    },
  },
  {
    key: 'operatorPanel',
    defaultLabel: 'Panel operatorski',
    defaultIcon: 'MonitorCog',
    defaultSortOrder: 15,
    requiredPermission: PERMISSIONS.PANEL_READ,
    core: false,
    pricing: IN_PACKAGE,
    readiness: 'ready',
    defaultConfig: {
      // Kafelki, które dostaje maszyna bez własnej konfiguracji. Świadomie
      // wąski zestaw: panel na hali ma mieć kilka wielkich przycisków, a nie
      // wszystko, co system potrafi.
      defaultPanelModules: ['production', 'downtime', 'andon'],
      // Domyślne źródło odrzutu dla nowej maszyny; nadpisywane per maszyna
      // w panelu admina (machine_configs.config.scrapSource).
      defaultScrapSource: 'operator',
    },
  },
  {
    key: 'machines',
    defaultLabel: 'Maszyny',
    defaultIcon: 'Factory',
    defaultSortOrder: 20,
    requiredPermission: PERMISSIONS.MACHINES_READ,
    core: false,
    pricing: IN_PACKAGE,
    readiness: 'ready',
    defaultConfig: {
      temperatureStream: true,
      operatorPanel: true,
      allowAddMachine: true,
    },
  },
  {
    key: 'andon',
    defaultLabel: 'Andon',
    defaultIcon: 'Siren',
    defaultSortOrder: 25,
    requiredPermission: PERMISSIONS.ANDON_READ,
    core: false,
    pricing: IN_PACKAGE,
    readiness: 'ready',
    defaultConfig: {
      allowReport: true,
      allowResolve: true,
      allowDelete: true,
    },
  },
  {
    key: 'orders',
    defaultLabel: 'Zlecenia',
    defaultIcon: 'ClipboardList',
    defaultSortOrder: 30,
    requiredPermission: PERMISSIONS.ORDERS_READ,
    core: false,
    pricing: IN_PACKAGE,
    readiness: 'ready',
    defaultConfig: {
      allowCreate: true,
      allowStatusChange: true,
      allowDelete: true,
    },
  },
  {
    key: 'planning',
    defaultLabel: 'Planowanie',
    defaultIcon: 'CalendarRange',
    defaultSortOrder: 32,
    requiredPermission: PERMISSIONS.PLANNING_READ,
    core: false,
    pricing: IN_PACKAGE,
    readiness: 'ready',
    defaultConfig: {
      defaultHorizonDays: 7,
    },
  },
  {
    key: 'bom',
    defaultLabel: 'Receptury (BOM)',
    defaultIcon: 'Boxes',
    defaultSortOrder: 35,
    requiredPermission: PERMISSIONS.BOM_READ,
    core: false,
    pricing: IN_PACKAGE,
    readiness: 'ready',
    defaultConfig: {
      allowEditRecipe: true,
      blockIssueOverStock: true,
    },
  },
  {
    key: 'maintenance',
    defaultLabel: 'Utrzymanie ruchu',
    defaultIcon: 'Wrench',
    defaultSortOrder: 40,
    requiredPermission: PERMISSIONS.MAINTENANCE_READ,
    core: false,
    pricing: IN_PACKAGE,
    readiness: 'ready',
    defaultConfig: {},
  },
  {
    key: 'quality',
    defaultLabel: 'Jakość',
    defaultIcon: 'ShieldCheck',
    defaultSortOrder: 45,
    requiredPermission: PERMISSIONS.QUALITY_READ,
    core: false,
    pricing: IN_PACKAGE,
    readiness: 'ready',
    defaultConfig: {
      allowRework: true,
      allowDeleteDefect: true,
    },
  },
  {
    key: 'traceability',
    defaultLabel: 'Genealogia',
    defaultIcon: 'GitBranch',
    defaultSortOrder: 46,
    requiredPermission: PERMISSIONS.TRACEABILITY_READ,
    core: false,
    pricing: IN_PACKAGE,
    readiness: 'ready',
    defaultConfig: {},
  },
  {
    key: 'scrap',
    defaultLabel: 'Odrzut (SCRAP)',
    defaultIcon: 'Trash2',
    defaultSortOrder: 47,
    requiredPermission: PERMISSIONS.SCRAP_READ,
    core: false,
    pricing: extra(15),
    readiness: 'ready',
    defaultConfig: {
      // Tag telemetrii z licznikiem odrzutu, gdy maszyna zgłasza go sama.
      // Wartość jest licznikiem narastającym — serwis liczy przyrosty.
      defaultTelemetryTag: 'scrap_count',
      // Odrzut z czujnika nie niesie przyczyny — trafia do tej kategorii,
      // dopóki ktoś jej nie zmieni ręcznie.
      defaultTelemetryCategory: 'UNCLASSIFIED',
      allowDelete: true,
    },
  },
  {
    key: 'inspections',
    defaultLabel: 'Kontrola wewnątrzprocesowa',
    defaultIcon: 'ClipboardCheck',
    defaultSortOrder: 48,
    requiredPermission: PERMISSIONS.QUALITY_READ,
    core: false,
    pricing: extra(20),
    readiness: 'preview',
    defaultConfig: {},
  },
  {
    key: 'safetyCrosses',
    defaultLabel: 'Krzyże BHP i niezgodności',
    defaultIcon: 'HeartPulse',
    defaultSortOrder: 49,
    requiredPermission: PERMISSIONS.QUALITY_READ,
    core: false,
    pricing: extra(20),
    readiness: 'preview',
    defaultConfig: {},
  },
  {
    key: 'analytics',
    defaultLabel: 'Analityka',
    defaultIcon: 'BarChart3',
    defaultSortOrder: 50,
    requiredPermission: PERMISSIONS.ANALYTICS_READ,
    core: false,
    pricing: IN_PACKAGE,
    readiness: 'ready',
    defaultConfig: {},
  },
  {
    key: 'historian',
    defaultLabel: 'Parametry technologiczne',
    defaultIcon: 'Activity',
    defaultSortOrder: 52,
    requiredPermission: PERMISSIONS.SENSORS_READ,
    core: false,
    pricing: extra(30),
    readiness: 'preview',
    defaultConfig: {},
  },
  {
    key: 'bi',
    defaultLabel: 'Business Intelligence',
    defaultIcon: 'Database',
    defaultSortOrder: 54,
    requiredPermission: PERMISSIONS.ANALYTICS_READ,
    core: false,
    pricing: extra(50),
    readiness: 'preview',
    defaultConfig: {},
  },
  {
    key: 'inventory',
    defaultLabel: 'Magazyn',
    defaultIcon: 'Package',
    defaultSortOrder: 60,
    requiredPermission: PERMISSIONS.INVENTORY_READ,
    core: false,
    pricing: IN_PACKAGE,
    readiness: 'ready',
    defaultConfig: {},
  },
  {
    key: 'operators',
    defaultLabel: 'Operatorzy',
    defaultIcon: 'Users',
    defaultSortOrder: 70,
    requiredPermission: PERMISSIONS.OPERATORS_READ,
    core: false,
    pricing: IN_PACKAGE,
    readiness: 'ready',
    defaultConfig: {},
  },
  {
    key: 'schedules',
    defaultLabel: 'Harmonogramy czasowe',
    defaultIcon: 'Clock',
    defaultSortOrder: 72,
    requiredPermission: PERMISSIONS.SHIFTS_READ,
    core: false,
    pricing: extra(25),
    readiness: 'ready',
    defaultConfig: {},
  },
  {
    key: 'instructions',
    defaultLabel: 'Instrukcje stanowiskowe',
    defaultIcon: 'BookOpen',
    defaultSortOrder: 75,
    requiredPermission: PERMISSIONS.MACHINES_READ,
    core: false,
    pricing: extra(20),
    readiness: 'preview',
    defaultConfig: {},
  },
  {
    key: 'stepper',
    defaultLabel: 'Stepper — sterowanie nadzorcze',
    defaultIcon: 'ListOrdered',
    defaultSortOrder: 80,
    requiredPermission: PERMISSIONS.MACHINES_CONTROL,
    core: false,
    pricing: extra(30),
    readiness: 'preview',
    defaultConfig: {},
  },
  {
    key: 'smartFactory',
    defaultLabel: 'Smart Factory',
    defaultIcon: 'Cpu',
    defaultSortOrder: 85,
    requiredPermission: PERMISSIONS.ANALYTICS_READ,
    core: false,
    pricing: extra(40),
    readiness: 'preview',
    defaultConfig: {},
  },
  {
    key: 'events',
    defaultLabel: 'Serwis eventów',
    defaultIcon: 'Zap',
    defaultSortOrder: 90,
    requiredPermission: PERMISSIONS.AUDIT_READ,
    core: false,
    pricing: extra(15),
    readiness: 'preview',
    defaultConfig: {},
  },
  {
    key: 'notifications',
    defaultLabel: 'Powiadomienia SMS / e-mail',
    defaultIcon: 'Mail',
    defaultSortOrder: 92,
    requiredPermission: PERMISSIONS.SETTINGS_READ,
    core: false,
    pricing: extra(10),
    readiness: 'preview',
    defaultConfig: {},
  },
  {
    key: 'integrations',
    defaultLabel: 'Integracje',
    defaultIcon: 'Plug',
    defaultSortOrder: 880,
    requiredPermission: PERMISSIONS.INTEGRATIONS_READ,
    core: false,
    pricing: extra(35),
    readiness: 'ready',
    defaultConfig: {},
  },
  {
    key: 'settings',
    defaultLabel: 'Ustawienia',
    defaultIcon: 'Settings',
    defaultSortOrder: 900,
    requiredPermission: null,
    core: true,
    pricing: IN_PACKAGE,
    readiness: 'ready',
    defaultConfig: {},
  },
];

export const MODULE_KEYS = MODULE_DEFINITIONS.map((m) => m.key);

export function findModuleDefinition(key: string): ModuleDefinition | undefined {
  return MODULE_DEFINITIONS.find((m) => m.key === key);
}

// Domyślna terminologia (pakiet "fabryka"). Pakiety branżowe nadpisują te klucze,
// a panel admina pozwala je zmienić ręcznie — patrz Tenant.terminology.
export const DEFAULT_TERMINOLOGY: Record<string, string> = {
  asset: 'Maszyna',
  assetPlural: 'Maszyny',
  workItem: 'Zlecenie',
  workItemPlural: 'Zlecenia',
  operator: 'Operator',
  operatorPlural: 'Operatorzy',
  site: 'Zakład',
  area: 'Linia',
};
