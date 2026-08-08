import { createFileRoute } from "@tanstack/react-router";
import { IntegrationsView } from "@/components/views/IntegrationsView";

export const Route = createFileRoute("/_dashboard/integrations")({
  component: IntegrationsView,
});
