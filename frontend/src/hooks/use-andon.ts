import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAndonAlert, deleteAndonAlert, getAndonAlerts, resolveAndonAlert } from "@/lib/api";

export function useAndonQuery(resolved?: boolean, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ["andon", resolved ?? "all"],
    queryFn: () => getAndonAlerts(resolved),
    ...options,
  });
}

export function useAndonMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["andon"] });

  const createMutation = useMutation({ mutationFn: createAndonAlert, onSuccess: invalidate });
  const resolveMutation = useMutation({ mutationFn: resolveAndonAlert, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: deleteAndonAlert, onSuccess: invalidate });

  return { createMutation, resolveMutation, deleteMutation };
}
