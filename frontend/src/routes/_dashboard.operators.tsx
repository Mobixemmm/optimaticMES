import { createFileRoute } from "@tanstack/react-router";
import { OperatorsView } from "@/components/views/OperatorsView";

export const Route = createFileRoute("/_dashboard/operators")({
  component: OperatorsView,
});
