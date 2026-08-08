import { createFileRoute } from "@tanstack/react-router";
import { OperatorPanelView } from "@/components/views/OperatorPanelView";

export const Route = createFileRoute("/_dashboard/operator-panel")({
  component: OperatorPanelView,
});
