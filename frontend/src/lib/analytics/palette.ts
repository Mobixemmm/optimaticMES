// Kolor idzie za bytem, nigdy za jego pozycją w rankingu. Przyczyna "Awaria"
// ma ten sam odcień wszędzie, gdzie w ogóle nosi barwę — także wtedy, gdy
// filtr zostawi na ekranie tylko dwie kategorie. Dlatego to jest sztywna mapa,
// a nie indeksowanie tablicy kolorów po pozycji.
//
// Zakres użycia jest jednak wąski i celowo taki został: barwa kategorialna
// pojawia się tam, gdzie segmenty stykają się bez własnej etykiety (stos
// w DayTrend) oraz przy kropkach na liście zdarzeń. Wykresy jednoserisowe —
// przestoje wg przyczyny, maszyny, linie — pokazują WIELKOŚĆ, nie tożsamość,
// więc noszą jeden odcień marki (MAGNITUDE_COLOR), a nazwę niesie etykieta
// przy słupku. Malowanie każdego słupka innym kolorem wydawałoby kanał
// tożsamości na powtórzenie tego, co już mówi jego długość.
//
// Wartości slotów siedzą w tokenach --chart-* (styles.css), gdzie opisana jest
// też kolejność i wynik walidacji dla obu trybów. To są DOMYŚLNE odcienie —
// użytkownik może je przemalować pod siebie, a wybór jest zapisany przy jego
// koncie (patrz lib/analytics/legend-colors.ts).
export const DEFAULT_REASON_COLOR: Record<string, string> = {
  failure: "var(--chart-1)",
  setup: "var(--chart-2)",
  material: "var(--chart-3)",
  micro_stop: "var(--chart-4)",
  quality: "var(--chart-5)",
  // Postój planowany nie jest stratą — neutralny, nie konkuruje z kategoriami.
  planned: "var(--chart-neutral)",
};

// Kolejność wyświetlania kategorii — stała, niezależna od tego, która akurat
// ma największy udział.
export const REASON_ORDER = [
  "failure",
  "setup",
  "material",
  "micro_stop",
  "quality",
  "planned",
] as const;

export const REASON_LABEL: Record<string, string> = {
  failure: "Awaria",
  setup: "Przezbrojenie",
  material: "Brak materiału",
  micro_stop: "Mikroprzestój",
  quality: "Jakość",
  planned: "Postój planowany",
};

/**
 * Domyślny odcień przyczyny — token motywu, a nie konkretny hex, więc sam
 * przestawia się między trybem jasnym a ciemnym.
 *
 * Wizuale NIE wołają tego bezpośrednio: idą przez useLegendColors(), które
 * najpierw sprawdza, czy użytkownik nie przemalował slotu pod siebie.
 */
export function defaultReasonColor(reason: string): string {
  return DEFAULT_REASON_COLOR[reason] ?? "var(--chart-neutral)";
}

export function reasonLabel(reason: string): string {
  return REASON_LABEL[reason] ?? reason;
}

// Wykresy jednoserisowe (np. minuty przestoju wg maszyny) pokazują wielkość,
// a nie tożsamość — jeden odcień, bez legendy, bez palety kategorialnej.
export const MAGNITUDE_COLOR = "var(--chart-magnitude)";
