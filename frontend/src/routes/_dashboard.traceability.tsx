import { createFileRoute } from "@tanstack/react-router";
import { TraceabilityView } from "@/components/views/TraceabilityView";

export const Route = createFileRoute("/_dashboard/traceability")({
  component: TraceabilityView,
});
