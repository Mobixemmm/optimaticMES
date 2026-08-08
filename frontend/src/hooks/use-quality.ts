import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createQualityDefect,
  deleteQualityDefect,
  getQualityDefects,
  getQualityPareto,
  resolveQualityDefect,
} from "@/lib/api";

export function useQualityDefectsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["quality", "defects"],
    queryFn: getQualityDefects,
    ...options,
  });
}

export function useQualityParetoQuery(days = 30, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["quality", "pareto", days],
    queryFn: () => getQualityPareto(days),
    ...options,
  });
}

export function useQualityMutations() {
  const queryClient = useQueryClient();
  // Karta wady przepisuje `scrapQuantity` na zleceniu, więc lista zleceń
  // i pulpit muszą się odświeżyć razem z samym modułem jakości.
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["quality"] });
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: ["analyticsSummary"] });
    void queryClient.invalidateQueries({ queryKey: ["analyticsDataset"] });
  };

  const createMutation = useMutation({ mutationFn: createQualityDefect, onSuccess: invalidate });
  const resolveMutation = useMutation({ mutationFn: resolveQualityDefect, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: deleteQualityDefect, onSuccess: invalidate });

  return { createMutation, resolveMutation, deleteMutation };
}
