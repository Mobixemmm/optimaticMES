import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createOperator, deleteOperator, getOperators, updateOperator } from "@/lib/api";

export function useOperatorsQuery(options?: { enabled?: boolean }) {
  return useQuery({ queryKey: ["operators"], queryFn: getOperators, ...options });
}

export function useOperatorMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["operators"] });

  const createMutation = useMutation({ mutationFn: createOperator, onSuccess: invalidate });
  const updateMutation = useMutation({ mutationFn: updateOperator, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: deleteOperator, onSuccess: invalidate });

  return { createMutation, updateMutation, deleteMutation };
}
