import { PERMISSIONS } from '../auth/permissions.constants';

// Rejestr kafelków panelu operatorskiego. To NIE jest ta sama lista co moduły
// aplikacji: moduł to zakładka w menu biura, kafelek to wielki przycisk na
// dotykowym ekranie przy maszynie. Jeden moduł może nie mieć kafelka w ogóle
// (Genealogia), a kafelek zawsze należy do jakiegoś modułu — bo jeśli klient
// nie kupił SCRAP-a, to przycisk odrzutu nie ma prawa stać na żadnym HMI.
export interface PanelModuleDefinition {
  key: string;
  label: string;
  description: string;
  icon: string;
  /** Moduł aplikacji, bez którego kafelek nie może być włączony. */
  requiresModule: string;
  /** Uprawnienie potrzebne, żeby operator mógł użyć kafelka. */
  requiredPermission: string | null;
}

export const PANEL_MODULES: PanelModuleDefinition[] = [
  {
    key: 'production',
    label: 'Rejestracja produkcji',
    description:
      'Bieżące zlecenie na maszynie i zgłaszanie wykonanych sztuk bez schodzenia ze stanowiska.',
    icon: 'ClipboardList',
    requiresModule: 'orders',
    requiredPermission: PERMISSIONS.ORDERS_UPDATE,
  },
  {
    key: 'scrap',
    label: 'Odrzut (SCRAP)',
    description:
      'Przycisk zgłoszenia braku z wyborem przyczyny z katalogu. Działa, gdy źródłem odrzutu jest operator.',
    icon: 'Trash2',
    requiresModule: 'scrap',
    requiredPermission: PERMISSIONS.SCRAP_REPORT,
  },
  {
    key: 'andon',
    label: 'Wezwanie Andon',
    description:
      'Wezwanie brygadzisty, utrzymania ruchu lub jakości jednym przyciskiem.',
    icon: 'Siren',
    requiresModule: 'andon',
    requiredPermission: PERMISSIONS.ANDON_REPORT,
  },
  {
    key: 'downtime',
    label: 'Zgłoszenie przestoju',
    description:
      'Start i koniec przestoju z podaniem przyczyny — to z tego liczy się Dostępność w OEE.',
    icon: 'Clock',
    requiresModule: 'machines',
    requiredPermission: PERMISSIONS.MACHINES_CONTROL,
  },
  {
    key: 'telemetry',
    label: 'Parametry technologiczne',
    description: 'Podgląd bieżących odczytów z czujników tej maszyny.',
    icon: 'Activity',
    requiresModule: 'historian',
    requiredPermission: PERMISSIONS.SENSORS_READ,
  },
  {
    key: 'instructions',
    label: 'Instrukcje stanowiskowe',
    description: 'Instrukcje i filmy przypisane do tego stanowiska.',
    icon: 'BookOpen',
    requiresModule: 'instructions',
    requiredPermission: null,
  },
  {
    key: 'inspection',
    label: 'Kontrola wewnątrzprocesowa',
    description: 'Lista kontrolna inspekcji stanowiska do odhaczenia na zmianie.',
    icon: 'ClipboardCheck',
    requiresModule: 'inspections',
    requiredPermission: PERMISSIONS.QUALITY_WRITE,
  },
];

export const PANEL_MODULE_KEYS = PANEL_MODULES.map((m) => m.key);

export function findPanelModule(key: string): PanelModuleDefinition | undefined {
  return PANEL_MODULES.find((m) => m.key === key);
}

// Skąd brać odrzut na danej maszynie. Wybór należy do wdrożeniowca w panelu
// admina, bo zależy od tego, co maszyna fizycznie potrafi:
//   operator  — tylko przycisk na HMI (stanowisko bez czujnika),
//   telemetry — tylko licznik z logów maszyny (operator nic nie klika),
//   both      — licznik liczy sztuki, a operator dopisuje przyczyny.
export const SCRAP_SOURCES = ['operator', 'telemetry', 'both'] as const;
export type ScrapSourceSetting = (typeof SCRAP_SOURCES)[number];
