import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endMachineStop, getCurrentMachineStop, startMachineStop } from "@/lib/api";

export function useCurrentMachineStopQuery(
  machineId: string | null,
  options?: { refetchInterval?: number },
) {
  return useQuery({
    queryKey: ["machineStop", machineId],
    queryFn: () => getCurrentMachineStop(machineId as string),
    enabled: !!machineId,
    ...options,
  });
}

export function useMachineStopMutations(machineId: string | null) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["machineStop", machineId] });
    queryClient.invalidateQueries({ queryKey: ["andon"] });
    queryClient.invalidateQueries({ queryKey: ["analyticsSummary"] });
  };

  const startMutation = useMutation({ mutationFn: startMachineStop, onSuccess: invalidate });
  const endMutation = useMutation({ mutationFn: endMachineStop, onSuccess: invalidate });

  return { startMutation, endMutation };
}
