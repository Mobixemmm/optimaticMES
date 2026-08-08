import { createFileRoute } from "@tanstack/react-router";
import { OrdersView } from "@/components/views/OrdersView";

export const Route = createFileRoute("/_dashboard/orders")({
  component: OrdersView,
});
