import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "@/components/views/DashboardView";

export const Route = createFileRoute("/_dashboard/")({
  component: DashboardView,
});
