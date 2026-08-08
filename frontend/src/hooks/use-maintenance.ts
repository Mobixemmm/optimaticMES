import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMaintenanceTask,
  deleteMaintenanceTask,
  getMaintenanceTasks,
  updateMaintenanceTask,
} from "@/lib/api";

export function useMaintenanceQuery(options?: { enabled?: boolean }) {
  return useQuery({ queryKey: ["maintenance"], queryFn: getMaintenanceTasks, ...options });
}

export function useMaintenanceMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["maintenance"] });

  const createMutation = useMutation({ mutationFn: createMaintenanceTask, onSuccess: invalidate });
  const updateMutation = useMutation({ mutationFn: updateMaintenanceTask, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: deleteMaintenanceTask, onSuccess: invalidate });

  return { createMutation, updateMutation, deleteMutation };
}
