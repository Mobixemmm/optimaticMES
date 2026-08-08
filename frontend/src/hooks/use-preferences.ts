import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUserPreferences,
  resetChartColors,
  saveChartColors,
  type ChartColorOverrides,
  type UserPreferences,
} from "@/lib/api";
import { useBootstrap } from "@/lib/bootstrap";

const PREFERENCES_KEY = ["userPreferences"] as const;

// Stała referencja, żeby "brak nadpisań" nie było przy każdym renderze nowym
// obiektem — inaczej useMemo w providerze przeliczałby się bez powodu.
const NO_OVERRIDES: ChartColorOverrides = {};

/**
 * Kolory legendy zapisane przy koncie użytkownika.
 *
 * Preferencje pobieramy tylko dla zalogowanego — gość dostałby 401, a jego
 * wybór i tak nie miałby gdzie zamieszkać.
 */
export function useChartColorsPreference() {
  const queryClient = useQueryClient();
  const { bootstrap } = useBootstrap();
  const canPersist = bootstrap.user !== null;

  const { data } = useQuery({
    queryKey: PREFERENCES_KEY,
    queryFn: getUserPreferences,
    enabled: canPersist,
    // Ustawienie zmienia wyłącznie właściciel konta i to z tej samej karty,
    // więc odpytywanie serwera co chwilę niczego by nie wniosło.
    staleTime: 5 * 60_000,
  });

  const writeCache = useCallback(
    (colors: ChartColorOverrides) =>
      queryClient.setQueryData<UserPreferences>(PREFERENCES_KEY, (previous) => ({
        ...previous,
        chartColors: colors,
      })),
    [queryClient],
  );

  // null = przywróć domyślne (DELETE), mapa = zapisz pełny stan nadpisań (PUT).
  const mutation = useMutation({
    mutationFn: (colors: ChartColorOverrides | null) =>
      colors === null ? resetChartColors() : saveChartColors(colors),
    // Wykres ma się przemalować w chwili wyboru, a nie po powrocie odpowiedzi —
    // stąd zapis do cache od razu i cofnięcie go, jeśli serwer odmówi.
    onMutate: async (colors) => {
      await queryClient.cancelQueries({ queryKey: PREFERENCES_KEY });
      const previous = queryClient.getQueryData<UserPreferences>(PREFERENCES_KEY);
      writeCache(colors ?? {});
      return { previous };
    },
    onError: (_error, _colors, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(PREFERENCES_KEY, context.previous);
      }
    },
    onSuccess: (saved) => writeCache(saved),
  });

  const { mutateAsync } = mutation;

  const save = useCallback(
    async (colors: ChartColorOverrides) => {
      await mutateAsync(colors);
    },
    [mutateAsync],
  );

  const reset = useCallback(async () => {
    await mutateAsync(null);
  }, [mutateAsync]);

  return {
    overrides: data?.chartColors ?? NO_OVERRIDES,
    save,
    reset,
    isSaving: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
    canPersist,
  };
}
