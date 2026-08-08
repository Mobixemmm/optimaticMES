import type { StopReason } from '../entities/machine-stop-event.entity';

// Katalog kluczy preferencji. Zamknięty celowo: gdyby endpoint przyjmował
// dowolny klucz, tabela stałaby się workiem na cokolwiek, co ktoś kiedyś wysłał
// z przeglądarki, i nikt po roku nie wiedziałby, które wpisy jeszcze coś znaczą.
export const PREFERENCE_KEYS = {
  /** Nadpisania kolorów legendy na wykresach analityki (przyczyna → hex). */
  CHART_COLORS: 'chartColors',
} as const;

export type PreferenceKey =
  (typeof PREFERENCE_KEYS)[keyof typeof PREFERENCE_KEYS];

// Sloty, które użytkownik może przemalować — dokładnie te same przyczyny, co
// w StopReason. Typ poniżej pilnuje, żeby dodanie przyczyny w encji i pominięcie
// jej tutaj nie przeszło kompilacji.
export const CHART_COLOR_SLOTS: readonly StopReason[] = [
  'failure',
  'setup',
  'material',
  'micro_stop',
  'quality',
  'planned',
];

// Przyjmujemy wyłącznie pełny hex #rrggbb. Frontend i tak wysyła taki format
// (natywny <input type="color">), a wąskie wejście oszczędza pytania w rodzaju
// "czy do wykresu wolno wpuścić nazwę koloru albo rgba() z przezroczystością".
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
