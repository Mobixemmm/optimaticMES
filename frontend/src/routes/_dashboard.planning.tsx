import { createFileRoute } from "@tanstack/react-router";
import { PlanningView } from "@/components/views/PlanningView";

export const Route = createFileRoute("/_dashboard/planning")({
  component: PlanningView,
});
