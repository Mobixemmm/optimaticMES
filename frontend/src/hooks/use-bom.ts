import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  consumeMaterial,
  createBomItem,
  deleteBomItem,
  deleteConsumption,
  getBomItems,
  getBomProducts,
  getOrderConsumptions,
  getOrderRequirements,
  updateBomItem,
} from "@/lib/api";

export function useBomProductsQuery(options?: { enabled?: boolean }) {
  return useQuery({ queryKey: ["bom", "products"], queryFn: getBomProducts, ...options });
}

export function useBomItemsQuery(productName: string) {
  return useQuery({
    queryKey: ["bom", "items", productName],
    queryFn: () => getBomItems(productName),
    enabled: productName.length > 0,
  });
}

export function useOrderRequirementsQuery(orderId: number | null) {
  return useQuery({
    queryKey: ["bom", "requirements", orderId],
    queryFn: () => getOrderRequirements(orderId as number),
    enabled: orderId !== null,
  });
}

export function useOrderConsumptionsQuery(orderId: number | null) {
  return useQuery({
    queryKey: ["bom", "consumptions", orderId],
    queryFn: () => getOrderConsumptions(orderId as number),
    enabled: orderId !== null,
  });
}

export function useBomMutations() {
  const queryClient = useQueryClient();
  // Wydanie materiału zdejmuje stan magazynowy i wchodzi do genealogii,
  // więc odświeżamy też magazyn i traceability, nie tylko sam BOM.
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["bom"] });
    void queryClient.invalidateQueries({ queryKey: ["inventory"] });
    void queryClient.invalidateQueries({ queryKey: ["traceability"] });
  };

  const createItemMutation = useMutation({ mutationFn: createBomItem, onSuccess: invalidate });
  const updateItemMutation = useMutation({ mutationFn: updateBomItem, onSuccess: invalidate });
  const deleteItemMutation = useMutation({ mutationFn: deleteBomItem, onSuccess: invalidate });
  const consumeMutation = useMutation({ mutationFn: consumeMaterial, onSuccess: invalidate });
  const deleteConsumptionMutation = useMutation({
    mutationFn: deleteConsumption,
    onSuccess: invalidate,
  });

  return {
    createItemMutation,
    updateItemMutation,
    deleteItemMutation,
    consumeMutation,
    deleteConsumptionMutation,
  };
}
