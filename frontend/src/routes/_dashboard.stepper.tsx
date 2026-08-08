import { createFileRoute } from "@tanstack/react-router";
import { ModulePreviewView } from "@/components/views/ModulePreviewView";

// Moduł jest w cenniku i w rejestrze, ale nie ma jeszcze logiki domenowej —
// widok mówi to wprost zamiast pokazywać pustą listę.
export const Route = createFileRoute("/_dashboard/stepper")({
  component: () => <ModulePreviewView moduleKey="stepper" />,
});
