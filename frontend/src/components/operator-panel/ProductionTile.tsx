import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateOrderProgress } from "@/lib/api";
import { useOrdersQuery } from "@/hooks/use-orders";
import { PanelButton, PanelEmpty, PanelTile } from "./PanelTile";

// Skoki, o które operator podbija licznik jednym dotknięciem. Wpisywanie liczby
// z klawiatury na panelu w rękawicy jest teoretyczne — realnie klika się +1 albo
// +10, a pole tekstowe zostaje dla rzadkiego przypadku dużej partii.
const QUICK_STEPS = [1, 5, 10, 50];

/**
 * Rejestracja produkcji: co jest teraz na maszynie i ile zrobiono.
 * To jest ta pozycja z cennika, która razem z Andonem stanowi pakiet bazowy —
 * bez niej OEE nie ma skąd wziąć wykonania.
 */
export function ProductionTile({ machineId }: { machineId: string }) {
  const queryClient = useQueryClient();
  const { data: orders = [] } = useOrdersQuery();
  const [manual, setManual] = useState("");

  const order = (orders as Record<string, unknown>[]).find(
    (o) => o.machineId === machineId && o.status === "in_progress",
  );

  const progressMutation = useMutation({
    mutationFn: updateOrderProgress,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["analyticsSummary"] });
      void queryClient.invalidateQueries({ queryKey: ["analyticsDataset"] });
      setManual("");
    },
  });

  if (!order) {
    return (
      <PanelTile title="Rejestracja produkcji" icon="ClipboardList">
        <PanelEmpty message="Na tej maszynie nie ma uruchomionego zlecenia. Zlecenie startuje planista albo brygadzista w module Zlecenia." />
      </PanelTile>
    );
  }

  const produced = Number(order.producedQuantity ?? 0);
  const quantity = Number(order.quantity ?? 0);
  const scrap = Number(order.scrapQuantity ?? 0);
  const pct = quantity > 0 ? Math.min(100, Math.round((produced / quantity) * 100)) : 0;
  const orderId = Number(order.id);

  const addProduced = (delta: number) =>
    progressMutation.mutate({ id: orderId, producedQuantity: produced + delta });

  return (
    <PanelTile
      title="Rejestracja produkcji"
      icon="ClipboardList"
      hint={`${String(order.orderNumber)} · ${String(order.productName)}`}
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-4xl font-bold tabular-nums leading-none text-foreground">
            {produced.toLocaleString("pl-PL")}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            z {quantity.toLocaleString("pl-PL")} szt.
            {scrap > 0 && ` · braki: ${scrap.toLocaleString("pl-PL")}`}
          </div>
        </div>
        <div className="text-2xl font-bold tabular-nums text-primary">{pct}%</div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {QUICK_STEPS.map((step) => (
          <PanelButton
            key={step}
            tone="primary"
            disabled={progressMutation.isPending}
            onClick={() => addProduced(step)}
          >
            +{step}
          </PanelButton>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Inna liczba"
          className="min-w-0 flex-1 rounded-2xl bg-muted px-4 py-3 text-base font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
        />
        <PanelButton
          onClick={() => addProduced(Number(manual))}
          disabled={
            progressMutation.isPending ||
            !manual ||
            Number.isNaN(Number(manual)) ||
            Number(manual) <= 0
          }
        >
          Dodaj
        </PanelButton>
      </div>

      {progressMutation.error && (
        <p className="mt-2 rounded-xl bg-destructive/15 px-3 py-2 text-xs text-destructive">
          {(progressMutation.error as Error).message}
        </p>
      )}
    </PanelTile>
  );
}
