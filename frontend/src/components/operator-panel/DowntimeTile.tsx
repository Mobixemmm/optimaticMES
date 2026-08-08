import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endMachineStop, getCurrentMachineStop, startMachineStop } from "@/lib/api";
import { REASON_ORDER, reasonLabel } from "@/lib/analytics/palette";
import { useLegendColors } from "@/lib/analytics/legend-colors";
import { PanelButton, PanelTile } from "./PanelTile";

/**
 * Start i koniec przestoju z podaniem przyczyny.
 *
 * Ten kafelek jest źródłem Dostępności w OEE — jeśli operator go nie użyje,
 * przestój policzy się jako czas pracy i wskaźnik skłamie. Dlatego przyczyny
 * są tymi samymi kodami co w analityce (jedna lista, jedno znaczenie) i noszą
 * te same kolory, łącznie z tymi, które użytkownik dobrał sobie sam.
 */
export function DowntimeTile({ machineId }: { machineId: string }) {
  const queryClient = useQueryClient();
  const { colorOf } = useLegendColors();

  const { data: current } = useQuery({
    queryKey: ["machineStop", machineId],
    queryFn: () => getCurrentMachineStop(machineId),
    refetchInterval: 15000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["machineStop", machineId] });
    void queryClient.invalidateQueries({ queryKey: ["analyticsSummary"] });
    void queryClient.invalidateQueries({ queryKey: ["analyticsDataset"] });
  };

  const startMutation = useMutation({ mutationFn: startMachineStop, onSuccess: invalidate });
  const endMutation = useMutation({ mutationFn: endMachineStop, onSuccess: invalidate });

  if (current) {
    const minutes = Math.max(
      0,
      Math.round((Date.now() - new Date(current.startFailure).getTime()) / 60000),
    );
    return (
      <PanelTile title="Przestój" icon="Clock" hint="Trwa — zakończ, gdy maszyna ruszy">
        <div className="flex items-center gap-3 rounded-2xl bg-warning/20 px-4 py-3">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ background: colorOf(current.reason) }}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-warning-foreground">
              {reasonLabel(current.reason)}
            </div>
            <div className="text-xs text-warning-foreground/80">
              trwa {minutes} min · od{" "}
              {new Date(current.startFailure).toLocaleTimeString("pl-PL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>

        <PanelButton
          tone="primary"
          className="mt-3 w-full"
          disabled={endMutation.isPending}
          onClick={() => endMutation.mutate(machineId)}
        >
          Zakończ przestój
        </PanelButton>

        {/* Bez tego operator przy nieudanym zakończeniu widział wyłącznie
            kafelek, który się nie zmienia — czyli "przycisk nie działa". */}
        {endMutation.error && (
          <p className="mt-2 rounded-xl bg-destructive/15 px-3 py-2 text-xs text-destructive">
            Nie udało się zakończyć przestoju: {(endMutation.error as Error).message}
          </p>
        )}
      </PanelTile>
    );
  }

  return (
    <PanelTile title="Przestój" icon="Clock" hint="Maszyna pracuje — zgłoś, gdy stanie">
      <div className="grid grid-cols-2 gap-2">
        {REASON_ORDER.map((reason) => (
          <PanelButton
            key={reason}
            tone="neutral"
            disabled={startMutation.isPending}
            onClick={() => startMutation.mutate({ machine: machineId, reason })}
            className="flex items-center justify-center gap-2 text-sm"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ background: colorOf(reason) }}
            />
            {reasonLabel(reason)}
          </PanelButton>
        ))}
      </div>

      {startMutation.error && (
        <p className="mt-2 rounded-xl bg-destructive/15 px-3 py-2 text-xs text-destructive">
          {(startMutation.error as Error).message}
        </p>
      )}
    </PanelTile>
  );
}
