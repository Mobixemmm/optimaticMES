import { createFileRoute } from "@tanstack/react-router";
import { SchedulesView } from "@/components/views/SchedulesView";

export const Route = createFileRoute("/_dashboard/schedules")({
  component: SchedulesView,
});
