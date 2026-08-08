import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createScrapCategory,
  deleteScrapEvent,
  getScrapCategories,
  getScrapEvents,
  getScrapSummary,
  reclassifyScrap,
  reportScrap,
  updateScrapCategory,
} from "@/lib/api";

export function useScrapCategoriesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["scrap", "categories"],
    queryFn: getScrapCategories,
    staleTime: 5 * 60_000,
    ...options,
  });
}

export function useScrapEventsQuery(
  days = 30,
  machineId?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["scrap", "events", days, machineId ?? null],
    queryFn: () => getScrapEvents(days, machineId),
    ...options,
  });
}

export function useScrapSummaryQuery(days = 30, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["scrap", "summary", days],
    queryFn: () => getScrapSummary(days),
    ...options,
  });
}

export function useScrapMutations() {
  const queryClient = useQueryClient();
  // Zgłoszenie odrzutu podbija scrapQuantity na zleceniu, a z tego liczy się
  // wskaźnik Jakości — zlecenia i analityka muszą przeliczyć się razem ze
  // SCRAP-em, inaczej dwa ekrany pokazują dwie różne prawdy o tej samej zmianie.
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["scrap"] });
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: ["analyticsSummary"] });
    void queryClient.invalidateQueries({ queryKey: ["analyticsDataset"] });
  };

  const reportMutation = useMutation({ mutationFn: reportScrap, onSuccess: invalidate });
  const reclassifyMutation = useMutation({ mutationFn: reclassifyScrap, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: deleteScrapEvent, onSuccess: invalidate });
  const createCategoryMutation = useMutation({
    mutationFn: createScrapCategory,
    onSuccess: invalidate,
  });
  const updateCategoryMutation = useMutation({
    mutationFn: updateScrapCategory,
    onSuccess: invalidate,
  });

  return {
    reportMutation,
    reclassifyMutation,
    deleteMutation,
    createCategoryMutation,
    updateCategoryMutation,
  };
}
