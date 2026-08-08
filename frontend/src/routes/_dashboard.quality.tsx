import { createFileRoute } from "@tanstack/react-router";
import { QualityView } from "@/components/views/QualityView";

export const Route = createFileRoute("/_dashboard/quality")({
  component: QualityView,
});
