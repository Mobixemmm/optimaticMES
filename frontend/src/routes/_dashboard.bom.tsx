import { createFileRoute } from "@tanstack/react-router";
import { BomView } from "@/components/views/BomView";

export const Route = createFileRoute("/_dashboard/bom")({
  component: BomView,
});
