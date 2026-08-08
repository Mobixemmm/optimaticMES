import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createInventoryItem,
  deleteInventoryItem,
  getInventory,
  updateInventoryItem,
} from "@/lib/api";

export function useInventoryQuery(options?: { enabled?: boolean }) {
  return useQuery({ queryKey: ["inventory"], queryFn: getInventory, ...options });
}

export function useInventoryMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["inventory"] });

  const createMutation = useMutation({ mutationFn: createInventoryItem, onSuccess: invalidate });
  const updateMutation = useMutation({ mutationFn: updateInventoryItem, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: deleteInventoryItem, onSuccess: invalidate });

  return { createMutation, updateMutation, deleteMutation };
}
