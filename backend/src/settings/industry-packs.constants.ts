// Pakiet branżowy = punkt startowy konfiguracji klienta, a nie zamknięty tryb
// pracy. Po zaimportowaniu wszystko (etykiety, moduły, terminologia, role) jest
// normalnie edytowalne w panelu administratora — pakiet tylko oszczędza
// klikania przy wdrożeniu.
//
// Nowa branża = nowy wpis w tej tablicy. Żaden kod widoków ani serwisów się
// przy tym nie zmienia, bo wszystkie te wartości i tak są czytane z bazy.
export interface IndustryPackModule {
  key: string;
  enabled?: boolean;
  label?: string;
  icon?: string;
  sortOrder?: number;
  config?: Record<string, unknown>;
}

export interface IndustryPackRole {
  code: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface IndustryPack {
  code: string;
  name: string;
  description: string;
  terminology: Record<string, string>;
  modules: IndustryPackModule[];
  roles: IndustryPackRole[];
}

export const INDUSTRY_PACKS: IndustryPack[] = [
  {
    code: 'factory',
    name: 'Fabryka / produkcja',
    description:
      'Klasyczny MES: zlecenia produkcyjne, OEE, przestoje maszyn, utrzymanie ruchu.',
    terminology: {
      asset: 'Maszyna',
      assetPlural: 'Maszyny',
      workItem: 'Zlecenie',
      workItemPlural: 'Zlecenia',
      operator: 'Operator',
      operatorPlural: 'Operatorzy',
      site: 'Zakład',
      area: 'Linia',
    },
    modules: [
      { key: 'machines', enabled: true, label: 'Maszyny', icon: 'Factory', sortOrder: 20 },
      { key: 'orders', enabled: true, label: 'Zlecenia', icon: 'ClipboardList', sortOrder: 30 },
      { key: 'maintenance', enabled: true, label: 'Utrzymanie ruchu', icon: 'Wrench', sortOrder: 40 },
      { key: 'analytics', enabled: true, label: 'Analityka', icon: 'BarChart3', sortOrder: 50 },
      { key: 'inventory', enabled: true, label: 'Magazyn', icon: 'Package', sortOrder: 60 },
      { key: 'operators', enabled: true, label: 'Operatorzy', icon: 'Users', sortOrder: 70 },
      { key: 'dashboard', config: { showKpiCards: true, showOeeChart: true, showShiftTile: true } },
    ],
    roles: [
      {
        code: 'shift_lead',
        name: 'Brygadzista',
        description: 'Prowadzi zmianę: zlecenia, przestoje, andon',
        permissions: [
          'orders.read', 'orders.update',
          'machines.read', 'machines.control',
          'operators.read',
          'maintenance.read', 'maintenance.write',
          'andon.read', 'andon.report', 'andon.resolve',
          'sensors.read', 'analytics.read', 'shifts.read',
        ],
      },
    ],
  },
  {
    code: 'airport',
    name: 'Port lotniczy',
    description:
      'Obsługa naziemna: stanowiska i taśmy bagażowe, obsługa lotów, punktualność.',
    terminology: {
      asset: 'Stanowisko',
      assetPlural: 'Stanowiska',
      workItem: 'Lot',
      workItemPlural: 'Loty',
      operator: 'Dyżurny',
      operatorPlural: 'Dyżurni',
      site: 'Terminal',
      area: 'Hala',
    },
    modules: [
      { key: 'machines', enabled: true, label: 'Stanowiska', icon: 'Luggage', sortOrder: 20 },
      { key: 'orders', enabled: true, label: 'Loty', icon: 'Plane', sortOrder: 10 },
      { key: 'maintenance', enabled: true, label: 'Serwis techniczny', icon: 'Wrench', sortOrder: 40 },
      { key: 'analytics', enabled: true, label: 'Punktualność', icon: 'BarChart3', sortOrder: 50 },
      // Lotnisko nie prowadzi magazynu produkcyjnego — moduł znika z menu,
      // ale jego dane i endpointy zostają nietknięte, gdyby wrócił.
      { key: 'inventory', enabled: false },
      { key: 'operators', enabled: true, label: 'Dyżurni', icon: 'Users', sortOrder: 70 },
      // Wykres OEE nie ma sensu przy obsłudze lotów — liczy się punktualność.
      { key: 'dashboard', config: { showKpiCards: true, showOeeChart: false, showShiftTile: true } },
    ],
    roles: [
      {
        code: 'duty_officer',
        name: 'Dyżurny operacyjny',
        description: 'Nadzoruje obsługę lotów i zgłoszenia z płyty',
        permissions: [
          'orders.read', 'orders.create', 'orders.update',
          'machines.read', 'machines.control',
          'operators.read',
          'maintenance.read', 'maintenance.write',
          'andon.read', 'andon.report', 'andon.resolve',
          'sensors.read', 'analytics.read', 'shifts.read',
        ],
      },
    ],
  },
  {
    code: 'warehouse',
    name: 'Magazyn / logistyka',
    description:
      'Awizacje i kompletacja: urządzenia strefowe, stany magazynowe, wydajność zmian.',
    terminology: {
      asset: 'Urządzenie',
      assetPlural: 'Urządzenia',
      workItem: 'Awizacja',
      workItemPlural: 'Awizacje',
      operator: 'Magazynier',
      operatorPlural: 'Magazynierzy',
      site: 'Magazyn',
      area: 'Strefa',
    },
    modules: [
      { key: 'inventory', enabled: true, label: 'Stany magazynowe', icon: 'Package', sortOrder: 20 },
      { key: 'orders', enabled: true, label: 'Awizacje', icon: 'PackageCheck', sortOrder: 10 },
      { key: 'machines', enabled: true, label: 'Urządzenia', icon: 'Truck', sortOrder: 30 },
      { key: 'maintenance', enabled: true, label: 'Serwis', icon: 'Wrench', sortOrder: 40 },
      { key: 'analytics', enabled: true, label: 'Wydajność', icon: 'BarChart3', sortOrder: 50 },
      { key: 'operators', enabled: true, label: 'Magazynierzy', icon: 'Users', sortOrder: 70 },
      { key: 'dashboard', config: { showKpiCards: true, showOeeChart: false, showShiftTile: true } },
    ],
    roles: [
      {
        code: 'warehouse_lead',
        name: 'Kierownik zmiany',
        description: 'Prowadzi zmianę magazynową: awizacje, stany, zgłoszenia',
        permissions: [
          'orders.read', 'orders.create', 'orders.update',
          'inventory.read', 'inventory.write',
          'machines.read', 'machines.control',
          'operators.read',
          'maintenance.read', 'maintenance.write',
          'andon.read', 'andon.report', 'andon.resolve',
          'sensors.read', 'analytics.read', 'shifts.read',
        ],
      },
    ],
  },
];

export function findIndustryPack(code: string): IndustryPack | undefined {
  return INDUSTRY_PACKS.find((pack) => pack.code === code);
}
