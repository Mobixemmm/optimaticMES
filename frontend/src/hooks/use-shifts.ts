import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createShift, deleteShift, getShifts, updateShift } from "@/lib/api";

export function useShiftsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["shifts"],
    queryFn: getShifts,
    ...options,
  });
}

export function useShiftMutations() {
  const queryClient = useQueryClient();
  // Kalendarz zmian wyznacza czas planowany, z którego liczy się Dostępność
  // w OEE — zmiana harmonogramu przelicza analitykę, nie tylko tę zakładkę.
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["shifts"] });
    void queryClient.invalidateQueries({ queryKey: ["analyticsSummary"] });
    void queryClient.invalidateQueries({ queryKey: ["analyticsDataset"] });
  };

  const createMutation = useMutation({ mutationFn: createShift, onSuccess: invalidate });
  const updateMutation = useMutation({ mutationFn: updateShift, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: deleteShift, onSuccess: invalidate });

  return { createMutation, updateMutation, deleteMutation };
}
