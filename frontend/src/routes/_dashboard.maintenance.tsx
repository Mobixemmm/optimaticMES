import { createFileRoute } from "@tanstack/react-router";
import { MaintenanceView } from "@/components/views/MaintenanceView";

export const Route = createFileRoute("/_dashboard/maintenance")({
  component: MaintenanceView,
});
