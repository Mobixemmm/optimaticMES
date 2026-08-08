import { createFileRoute } from "@tanstack/react-router";
import { AnalyticsView } from "@/components/views/AnalyticsView";

export const Route = createFileRoute("/_dashboard/analytics")({
  component: AnalyticsView,
});
