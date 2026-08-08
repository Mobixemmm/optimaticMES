import { createContext, useContext } from "react";

// Wymiary, po których wizuale filtrują się nawzajem. Każdy wizual deklaruje,
// który wymiar *emituje* — i to jest podstawa reguły filtrowania krzyżowego
// niżej.
export type FilterDimension = "machine" | "reason" | "day" | "line" | "orderStatus";

export type FilterState = Record<FilterDimension, string[]>;

export const EMPTY_FILTERS: FilterState = {
  machine: [],
  reason: [],
  day: [],
  line: [],
  orderStatus: [],
};

export const DIMENSION_LABEL: Record<FilterDimension, string> = {
  machine: "Maszyna",
  reason: "Przyczyna",
  day: "Dzień",
  line: "Linia",
  orderStatus: "Status zlecenia",
};

export interface CrossFilterApi {
  filters: FilterState;
  /**
   * Zachowanie skopiowane z narzędzi BI, bo użytkownicy je znają:
   *  - zwykłe kliknięcie zawęża wymiar DO tej jednej wartości,
   *  - kliknięcie w jedyną zaznaczoną wartość czyści wymiar (klik = przełącznik),
   *  - Ctrl/Cmd+klik dokłada lub odejmuje wartość, nie kasując pozostałych.
   */
  toggle: (dimension: FilterDimension, value: string, additive: boolean) => void;
  clear: (dimension?: FilterDimension) => void;
  remove: (dimension: FilterDimension, value: string) => void;
  isSelected: (dimension: FilterDimension, value: string) => boolean;
  hasSelection: (dimension: FilterDimension) => boolean;
  activeCount: number;
}

export const CrossFilterContext = createContext<CrossFilterApi | null>(null);

export function useCrossFilter(): CrossFilterApi {
  const ctx = useContext(CrossFilterContext);
  if (!ctx) {
    throw new Error("useCrossFilter wymaga opakowania w <CrossFilterProvider>");
  }
  return ctx;
}
