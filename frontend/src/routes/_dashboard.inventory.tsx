import { createFileRoute } from "@tanstack/react-router";
import { InventoryView } from "@/components/views/InventoryView";

export const Route = createFileRoute("/_dashboard/inventory")({
  component: InventoryView,
});
