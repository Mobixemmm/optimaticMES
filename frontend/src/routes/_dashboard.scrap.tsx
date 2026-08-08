import { createFileRoute } from "@tanstack/react-router";
import { ScrapView } from "@/components/views/ScrapView";

export const Route = createFileRoute("/_dashboard/scrap")({
  component: ScrapView,
});
