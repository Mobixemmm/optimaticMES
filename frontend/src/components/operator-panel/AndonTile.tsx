import { useState } from "react";
import { Check } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAndonAlert } from "@/lib/api";
import { PanelButton, PanelTile } from "./PanelTile";

// Wezwania, które realnie padają na hali. Świadomie cztery, nie dwanaście:
// lista, którą trzeba czytać, przestaje być przyciskiem alarmowym.
const CALLS: { type: string; label: string; tone: "danger" | "warning" | "neutral" }[] = [
  { type: "maintenance", label: "Utrzymanie ruchu", tone: "danger" },
  { type: "quality", label: "Kontrola jakości", tone: "warning" },
  { type: "material", label: "Brak materiału", tone: "warning" },
  { type: "supervisor", label: "Brygadzista", tone: "neutral" },
];

const TONE_TO_SEVERITY: Record<string, "err" | "warn" | "info"> = {
  danger: "err",
  warning: "warn",
  neutral: "info",
};

/** Wezwanie pomocy jednym dotknięciem — pozycja z pakietu bazowego. */
export function AndonTile({ machineId, machineName }: { machineId: string; machineName: string }) {
  const queryClient = useQueryClient();
  const [sent, setSent] = useState<string | null>(null);

  const callMutation = useMutation({
    mutationFn: createAndonAlert,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["andon"] });
    },
  });

  const call = (type: string, label: string, tone: string) => {
    callMutation.mutate(
      {
        type,
        machineId,
        message: `${label} — wezwanie z panelu ${machineName}`,
        tone: TONE_TO_SEVERITY[tone] ?? "info",
      },
      {
        onSuccess: () => {
          setSent(label);
          setTimeout(() => setSent(null), 5000);
        },
      },
    );
  };

  return (
    <PanelTile title="Wezwanie Andon" icon="Siren" hint="Zgłoszenie trafia od razu na tablicę">
      {sent && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-success/20 px-4 py-3 text-sm font-bold text-success-foreground">
          <Check className="h-4 w-4 shrink-0" />
          Wezwano: {sent}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {CALLS.map((item) => (
          <PanelButton
            key={item.type}
            tone={item.tone}
            disabled={callMutation.isPending}
            onClick={() => call(item.type, item.label, item.tone)}
            className="text-sm"
          >
            {item.label}
          </PanelButton>
        ))}
      </div>

      {callMutation.error && (
        <p className="mt-2 rounded-xl bg-destructive/15 px-3 py-2 text-xs text-destructive">
          {(callMutation.error as Error).message}
        </p>
      )}
    </PanelTile>
  );
}
