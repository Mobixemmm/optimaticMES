import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assignOrderToMachine, getPlanningBoard, reorderMachineQueue } from "@/lib/api";

export function usePlanningBoardQuery(days = 7, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["planning", "board", days],
    queryFn: () => getPlanningBoard(days),
    ...options,
  });
}

export function usePlanningMutations() {
  const queryClient = useQueryClient();
  // Przypisanie zmienia zlecenie, więc lista zleceń i pulpit muszą to zobaczyć.
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["planning"] });
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const assignMutation = useMutation({ mutationFn: assignOrderToMachine, onSuccess: invalidate });
  const reorderMutation = useMutation({ mutationFn: reorderMachineQueue, onSuccess: invalidate });

  return { assignMutation, reorderMutation };
}
