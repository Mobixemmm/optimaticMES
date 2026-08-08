import { useMemo, type ReactNode } from "react";
import { useChartColorsPreference } from "@/hooks/use-preferences";
import { LegendColorContext, type LegendColorApi } from "./legend-colors";
import { defaultReasonColor } from "./palette";

/**
 * Podaje wizualom analityki kolory przyczyn: te wybrane przez użytkownika,
 * a dla reszty slotów domyślne odcienie motywu.
 *
 * Provider siedzi wysoko, nad wszystkimi wykresami, bo tożsamość barwna musi
 * być spójna między wizualami — przemalowana "Awaria" ma zmienić kolor
 * jednocześnie na stosie w DayTrend i na kropkach w tabeli zdarzeń, inaczej
 * ten sam kolor znaczyłby na jednym ekranie dwie różne rzeczy.
 */
export function LegendColorProvider({ children }: { children: ReactNode }) {
  const { overrides, save, reset, isSaving, error, canPersist } = useChartColorsPreference();

  const api = useMemo<LegendColorApi>(
    () => ({
      colorOf: (reason: string) => overrides[reason] ?? defaultReasonColor(reason),
      overrides,
      save,
      reset,
      isSaving,
      error,
      canPersist,
    }),
    [overrides, save, reset, isSaving, error, canPersist],
  );

  return <LegendColorContext.Provider value={api}>{children}</LegendColorContext.Provider>;
}
