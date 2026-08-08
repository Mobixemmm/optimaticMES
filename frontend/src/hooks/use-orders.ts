import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createOrder, deleteOrder, getOrders, updateOrderStatus } from "@/lib/api";

export function useOrdersQuery(options?: { enabled?: boolean }) {
  return useQuery({ queryKey: ["orders"], queryFn: getOrders, ...options });
}

export function useOrderMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["orders"] });

  const createMutation = useMutation({ mutationFn: createOrder, onSuccess: invalidate });
  const statusMutation = useMutation({ mutationFn: updateOrderStatus, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: deleteOrder, onSuccess: invalidate });

  return { createMutation, statusMutation, deleteMutation };
}
