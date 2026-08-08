import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkUpdateMachineConfigs,
  getMachineConfig,
  getMachineConfigs,
  getPanelModules,
  updateMachineConfig,
} from "@/lib/api";

export function usePanelModulesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["machineConfigs", "panelModules"],
    queryFn: getPanelModules,
    // Katalog kafelków zmienia się razem z wdrożeniem, nie w trakcie zmiany.
    staleTime: 5 * 60_000,
    ...options,
  });
}

export function useMachineConfigsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["machineConfigs", "list"],
    queryFn: getMachineConfigs,
    ...options,
  });
}

export function useMachineConfigQuery(machineId: string | null) {
  return useQuery({
    queryKey: ["machineConfigs", "one", machineId],
    queryFn: () => getMachineConfig(machineId!),
    enabled: machineId !== null && machineId !== "",
  });
}

export function useMachineConfigMutations() {
  const queryClient = useQueryClient();
  // Zmiana kafelków przestawia panel operatora natychmiast, więc unieważniamy
  // całą gałąź — pojedynczy panel i lista w panelu admina muszą się zgadzać.
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["machineConfigs"] });
  };

  const updateMutation = useMutation({ mutationFn: updateMachineConfig, onSuccess: invalidate });
  const bulkMutation = useMutation({ mutationFn: bulkUpdateMachineConfigs, onSuccess: invalidate });

  return { updateMutation, bulkMutation };
}
