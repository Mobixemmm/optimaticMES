import { useQuery } from "@tanstack/react-query";
import { getAnalyticsDataset, getAnalyticsSummary } from "@/lib/api";
import { EMPTY_DATASET, type Dataset } from "@/lib/analytics/model";

export function useAnalyticsSummaryQuery(days = 30, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ["analyticsSummary", days],
    queryFn: () => getAnalyticsSummary(days),
    ...options,
  });
}

export function useAnalyticsDatasetQuery(days = 30, options?: { refetchInterval?: number }) {
  const query = useQuery({
    queryKey: ["analyticsDataset", days],
    queryFn: () => getAnalyticsDataset(days),
    // Przy odświeżaniu trzymamy poprzednie dane, żeby wykresy nie mrugały
    // szkieletem i nie przeskakiwał układ strony.
    placeholderData: (previous: Dataset | undefined) => previous,
    ...options,
  });

  const dataset: Dataset = query.data ?? EMPTY_DATASET;
  return { ...query, dataset };
}
