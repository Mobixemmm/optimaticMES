import type { FilterDimension } from "./filters";

// Co ma się stać po kliknięciu kafelka KPI. Zestaw jest celowo krótki —
// trzy zachowania pokrywają realne potrzeby, a każde kolejne zamieniałoby
// konfigurację w język programowania w bazie.
export type KpiActionType = "none" | "drilldown" | "navigate" | "filter";

export interface KpiAction {
  type: KpiActionType;
  /** navigate: ścieżka modułu, np. "/analytics" */
  to?: string;
  /** filter: wymiar i wartość nakładane na pulpit analityczny */
  dimension?: FilterDimension;
  value?: string;
}

export interface KpiDefinition {
  key: string;
  label: string;
  /** Akcja użyta, gdy klient nic nie ustawił w panelu administratora. */
  defaultAction: KpiAction;
}

// Rejestr kafelków, które kod potrafi wyrenderować. Baza (module_configs.config
// .kpiActions) decyduje tylko, co robi kliknięcie — nie o tym, jakie kafelki
// istnieją, bo każdy z nich ma własne źródło liczby w kodzie widoku.
export const KPI_REGISTRY: Record<string, KpiDefinition[]> = {
  dashboard: [
    {
      key: "oee",
      label: "OEE ogólne",
      defaultAction: { type: "navigate", to: "/analytics" },
    },
    {
      key: "shiftProduced",
      label: "Wyprodukowane sztuki (zmiana)",
      defaultAction: { type: "drilldown" },
    },
    {
      key: "activeOrders",
      label: "Aktywne zlecenia",
      defaultAction: { type: "navigate", to: "/orders" },
    },
    { key: "andon", label: "Alerty Andon", defaultAction: { type: "drilldown" } },
  ],
  analytics: [
    { key: "oee", label: "OEE ogólne", defaultAction: { type: "drilldown" } },
    { key: "availability", label: "Dostępność", defaultAction: { type: "drilldown" } },
    { key: "performance", label: "Wydajność", defaultAction: { type: "drilldown" } },
    { key: "quality", label: "Jakość (FPY)", defaultAction: { type: "drilldown" } },
  ],
};

// Cele nawigacji oferowane w panelu administratora. Trzymamy je tu, a nie
// w bazie, bo ścieżki odpowiadają plikom tras — baza nie ma prawa ich wymyślać
// (ta sama zasada co MODULE_PATHS w Sidebarze).
export const KPI_NAVIGATION_TARGETS: { path: string; label: string }[] = [
  { path: "/", label: "Pulpit" },
  { path: "/machines", label: "Maszyny" },
  { path: "/orders", label: "Zlecenia" },
  { path: "/maintenance", label: "Utrzymanie ruchu" },
  { path: "/analytics", label: "Analityka" },
  { path: "/inventory", label: "Magazyn" },
  { path: "/operators", label: "Operatorzy" },
];

export const KPI_ACTION_LABEL: Record<KpiActionType, string> = {
  none: "Nieklikalny",
  drilldown: "Pokaż szczegóły na miejscu",
  navigate: "Przejdź do strony",
  filter: "Nałóż filtr na pulpicie",
};

/**
 * Wyciąga akcję kafelka z konfiguracji modułu, z zejściem do domyślnej.
 * Nieznany typ akcji (np. zapisany przez nowszą wersję aplikacji) traktujemy
 * jak brak konfiguracji, zamiast renderować martwy kafelek.
 */
export function resolveKpiAction(
  moduleKey: string,
  kpiKey: string,
  moduleConfig: Record<string, unknown>,
): KpiAction {
  const definition = KPI_REGISTRY[moduleKey]?.find((k) => k.key === kpiKey);
  const fallback = definition?.defaultAction ?? { type: "none" };

  const configured = (moduleConfig?.kpiActions as Record<string, KpiAction> | undefined)?.[kpiKey];
  if (!configured || !KPI_ACTION_LABEL[configured.type]) {
    return fallback;
  }
  if (configured.type === "navigate" && !configured.to) {
    return fallback;
  }
  if (configured.type === "filter" && (!configured.dimension || !configured.value)) {
    return fallback;
  }
  return configured;
}
