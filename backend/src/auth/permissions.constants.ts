// Kanoniczny katalog uprawnień. To jedyne miejsce w kodzie, gdzie uprawnienia są
// wyliczone — role NIE są już zaszyte w kodzie (patrz encja Role), więc klient
// może w panelu admina złożyć własną rolę z dowolnego podzbioru tej listy.
// Konwencja: <zasób>.<akcja>.
export const PERMISSIONS = {
  ORDERS_READ: 'orders.read',
  ORDERS_CREATE: 'orders.create',
  ORDERS_UPDATE: 'orders.update',
  ORDERS_DELETE: 'orders.delete',

  MACHINES_READ: 'machines.read',
  MACHINES_WRITE: 'machines.write',
  MACHINES_CONTROL: 'machines.control',

  OPERATORS_READ: 'operators.read',
  OPERATORS_WRITE: 'operators.write',

  INVENTORY_READ: 'inventory.read',
  INVENTORY_WRITE: 'inventory.write',
  INVENTORY_DELETE: 'inventory.delete',

  MAINTENANCE_READ: 'maintenance.read',
  MAINTENANCE_WRITE: 'maintenance.write',
  MAINTENANCE_DELETE: 'maintenance.delete',

  ANDON_READ: 'andon.read',
  ANDON_REPORT: 'andon.report',
  ANDON_RESOLVE: 'andon.resolve',
  ANDON_DELETE: 'andon.delete',

  QUALITY_READ: 'quality.read',
  QUALITY_WRITE: 'quality.write',
  QUALITY_DELETE: 'quality.delete',

  // Receptury i wydania materiału. Genealogia jest tylko do odczytu — powstaje
  // z zapisów innych modułów, nikt nie "tworzy" jej ręcznie.
  BOM_READ: 'bom.read',
  BOM_WRITE: 'bom.write',
  BOM_DELETE: 'bom.delete',
  TRACEABILITY_READ: 'traceability.read',

  PLANNING_READ: 'planning.read',
  PLANNING_WRITE: 'planning.write',

  SENSORS_READ: 'sensors.read',
  ANALYTICS_READ: 'analytics.read',

  SHIFTS_READ: 'shifts.read',
  SHIFTS_WRITE: 'shifts.write',

  // Panel operatorski (HMI). Odczyt to prawo do otwarcia panelu maszyny;
  // konfiguracja to prawo do decydowania, JAKIE kafelki na niej stoją —
  // to drugie należy do wdrożeniowca, nie do operatora przy maszynie.
  PANEL_READ: 'panel.read',
  PANEL_CONFIGURE: 'panel.configure',

  // Odrzut: zgłoszenie z przycisku na hali to codzienna czynność operatora,
  // kasowanie zgłoszenia i edycja katalogu kategorii — już nie.
  SCRAP_READ: 'scrap.read',
  SCRAP_REPORT: 'scrap.report',
  SCRAP_DELETE: 'scrap.delete',
  SCRAP_CATEGORIES_WRITE: 'scrap.categories.write',

  AUDIT_READ: 'audit.read',

  // Konfiguracja aplikacji: moduły, terminologia, pakiety branżowe.
  SETTINGS_READ: 'settings.read',
  SETTINGS_WRITE: 'settings.write',

  // Połączenia z ERP/WMS/AODB. Trzymają hasła do systemów klienta, więc
  // domyślnie tylko admin — patrz migracja CreateIntegrations.
  INTEGRATIONS_READ: 'integrations.read',
  INTEGRATIONS_WRITE: 'integrations.write',
  INTEGRATIONS_DELETE: 'integrations.delete',

  USERS_READ: 'users.read',
  USERS_WRITE: 'users.write',

  ROLES_READ: 'roles.read',
  ROLES_WRITE: 'roles.write',

  // Struktura organizacyjna: zakłady i obszary.
  TENANCY_READ: 'tenancy.read',
  TENANCY_WRITE: 'tenancy.write',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

// Grupy używane przez panel admina do wyświetlenia checkboxów przy edycji roli.
export const PERMISSION_GROUPS: { group: string; permissions: Permission[] }[] = [
  {
    group: 'Zlecenia',
    permissions: [
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.ORDERS_CREATE,
      PERMISSIONS.ORDERS_UPDATE,
      PERMISSIONS.ORDERS_DELETE,
    ],
  },
  {
    group: 'Maszyny i telemetria',
    permissions: [
      PERMISSIONS.MACHINES_READ,
      PERMISSIONS.MACHINES_WRITE,
      PERMISSIONS.MACHINES_CONTROL,
      PERMISSIONS.SENSORS_READ,
    ],
  },
  {
    group: 'Operatorzy',
    permissions: [PERMISSIONS.OPERATORS_READ, PERMISSIONS.OPERATORS_WRITE],
  },
  {
    group: 'Magazyn',
    permissions: [
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_WRITE,
      PERMISSIONS.INVENTORY_DELETE,
    ],
  },
  {
    group: 'Utrzymanie ruchu',
    permissions: [
      PERMISSIONS.MAINTENANCE_READ,
      PERMISSIONS.MAINTENANCE_WRITE,
      PERMISSIONS.MAINTENANCE_DELETE,
    ],
  },
  {
    group: 'Jakość',
    permissions: [
      PERMISSIONS.QUALITY_READ,
      PERMISSIONS.QUALITY_WRITE,
      PERMISSIONS.QUALITY_DELETE,
    ],
  },
  {
    group: 'Planowanie',
    permissions: [PERMISSIONS.PLANNING_READ, PERMISSIONS.PLANNING_WRITE],
  },
  {
    group: 'Receptury i genealogia',
    permissions: [
      PERMISSIONS.BOM_READ,
      PERMISSIONS.BOM_WRITE,
      PERMISSIONS.BOM_DELETE,
      PERMISSIONS.TRACEABILITY_READ,
    ],
  },
  {
    group: 'Andon',
    permissions: [
      PERMISSIONS.ANDON_READ,
      PERMISSIONS.ANDON_REPORT,
      PERMISSIONS.ANDON_RESOLVE,
      PERMISSIONS.ANDON_DELETE,
    ],
  },
  {
    group: 'Analityka i zmiany',
    permissions: [
      PERMISSIONS.ANALYTICS_READ,
      PERMISSIONS.SHIFTS_READ,
      PERMISSIONS.SHIFTS_WRITE,
      PERMISSIONS.AUDIT_READ,
    ],
  },
  {
    group: 'Panel operatorski',
    permissions: [PERMISSIONS.PANEL_READ, PERMISSIONS.PANEL_CONFIGURE],
  },
  {
    group: 'Odrzut (SCRAP)',
    permissions: [
      PERMISSIONS.SCRAP_READ,
      PERMISSIONS.SCRAP_REPORT,
      PERMISSIONS.SCRAP_DELETE,
      PERMISSIONS.SCRAP_CATEGORIES_WRITE,
    ],
  },
  {
    group: 'Administracja',
    permissions: [
      PERMISSIONS.SETTINGS_READ,
      PERMISSIONS.SETTINGS_WRITE,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_WRITE,
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.ROLES_WRITE,
      PERMISSIONS.TENANCY_READ,
      PERMISSIONS.TENANCY_WRITE,
    ],
  },
  {
    group: 'Integracje',
    permissions: [
      PERMISSIONS.INTEGRATIONS_READ,
      PERMISSIONS.INTEGRATIONS_WRITE,
      PERMISSIONS.INTEGRATIONS_DELETE,
    ],
  },
];
