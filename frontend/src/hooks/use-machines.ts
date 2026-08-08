import { useQuery } from "@tanstack/react-query";
import { getLatestMachineData, getMachineLatest, getMachinesList } from "@/lib/api";

export function useLatestMachineDataQuery(options?: {
  refetchInterval?: number;
  enabled?: boolean;
}) {
  return useQuery({ queryKey: ["latestMachineData"], queryFn: getLatestMachineData, ...options });
}

export function useMachinesListQuery() {
  return useQuery({ queryKey: ["machinesList"], queryFn: getMachinesList });
}

export function useMachineLatestQuery(machineId: string, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ["machineLatestValues", machineId],
    queryFn: () => getMachineLatest(machineId),
    ...options,
  });
}
