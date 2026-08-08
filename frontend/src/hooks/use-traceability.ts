import { useQuery } from "@tanstack/react-query";
import { getBatches, getBatchTrace, getOrderTrace } from "@/lib/api";

export function useBatchesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["traceability", "batches"],
    queryFn: getBatches,
    ...options,
  });
}

export function useOrderTraceQuery(orderId: number | null) {
  return useQuery({
    queryKey: ["traceability", "order", orderId],
    queryFn: () => getOrderTrace(orderId as number),
    enabled: orderId !== null,
  });
}

export function useBatchTraceQuery(batchNumber: string) {
  return useQuery({
    queryKey: ["traceability", "batch", batchNumber],
    queryFn: () => getBatchTrace(batchNumber),
    enabled: batchNumber.length > 0,
  });
}
