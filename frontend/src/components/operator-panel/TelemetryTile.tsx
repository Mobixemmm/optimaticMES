import { useMachineLatestQuery } from "@/hooks/use-machines";
import { PanelEmpty, PanelTile } from "./PanelTile";

// Odczyt z panelu ma być aktualny, ale nie kosztować maszyny co sekundę —
// pięć sekund to kompromis wystarczający dla oka operatora.
const REFRESH_MS = 5000;

function formatValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  if (typeof value === "boolean") return value ? "TAK" : "NIE";
  return String(value ?? "—");
}

/** Bieżące odczyty czujników tej maszyny — kafelek modułu Historian. */
export function TelemetryTile({ machineId }: { machineId: string }) {
  const { data, isLoading } = useMachineLatestQuery(machineId, {
    refetchInterval: REFRESH_MS,
  });

  const entries = Object.entries((data ?? {}) as Record<string, { value: unknown; time: string }>);

  return (
    <PanelTile
      title="Parametry technologiczne"
      icon="Activity"
      hint={`Odświeżane co ${REFRESH_MS / 1000} s`}
    >
      {entries.length === 0 ? (
        <PanelEmpty
          message={
            isLoading ? "Wczytywanie odczytów…" : "Ta maszyna nie zgłasza żadnych tagów telemetrii."
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {entries.map(([tag, reading]) => (
            <li key={tag} className="rounded-2xl bg-muted/60 px-3 py-2.5">
              <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {tag}
              </div>
              <div className="truncate text-xl font-bold tabular-nums text-foreground">
                {formatValue(reading?.value)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelTile>
  );
}
