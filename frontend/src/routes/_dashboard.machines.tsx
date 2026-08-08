import { createFileRoute } from "@tanstack/react-router";
import { MachinesView } from "@/components/views/MachinesView";

export const Route = createFileRoute("/_dashboard/machines")({
  component: MachinesView,
});
