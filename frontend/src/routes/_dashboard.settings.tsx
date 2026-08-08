import { createFileRoute } from "@tanstack/react-router";
import { SettingsView } from "@/components/views/SettingsView";

export const Route = createFileRoute("/_dashboard/settings")({
  component: SettingsView,
});
