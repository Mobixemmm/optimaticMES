import { createFileRoute } from "@tanstack/react-router";
import { AndonView } from "@/components/views/AndonView";

export const Route = createFileRoute("/_dashboard/andon")({
  component: AndonView,
});
