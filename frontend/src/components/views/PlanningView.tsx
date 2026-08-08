import { useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, HelpCircle, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePlanningBoardQuery, usePlanningMutations } from "@/hooks/use-planning";
import type { PlannedOrderRow } from "@/lib/api";
import { Header } from "@/components/shared/Header";
import { KpiCard } from "@/components/shared/KpiCard";

const HORIZONS = [
  { days: 1, label: "Dziś" },
  { days: 7, label: "7 dni" },
  { days: 14, label: "14 dni" },
  { days: 30, label: "30 dni" },
];

function fmtHours(minutes: number): string {
  const hours = minutes / 60;
  return `${hours.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} h`;
}

function loadTone(pct: number, overloaded: boolean): string {
  if (overloaded) return "bg-destructive";
  if (pct >= 85) return "bg-warning";
  return "bg-success";
}

export function PlanningView() {
  const { permissions } = useAuth();
  const canPlan = permissions.canManagePlanning;

  const [days, setDays] = useState(7);
  const { data: board, isLoading, error } = usePlanningBoardQuery(days);
  const { assignMutation, reorderMutation } = usePlanningMutations();
  const [actionError, setActionError] = useState("");

  const machines = board?.machines ?? [];
  const unassigned = board?.unassigned ?? [];

  const totalWork = machines.reduce((sum, m) => sum + m.workMinutes, 0);
  const totalCapacity = machines.reduce((sum, m) => sum + m.capacityMinutes, 0);
  const overloadedCount = machines.filter((m) => m.overloaded).length;
  const withoutEstimate =
    machines.reduce((sum, m) => sum + m.ordersWithoutEstimate, 0) +
    unassigned.filter((o) => o.workMinutes === null).length;

  const run = (fn: () => void) => {
    setActionError("");
    fn();
  };

  const onError = (err: any) => setActionError(err.message || "Nie udało się zapisać zmiany");

  const assign = (orderId: number, machineId: string | null) =>
    run(() => assignMutation.mutate({ id: orderId, machineId }, { onError }));

  const move = (machineId: string, orders: PlannedOrderRow[], index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= orders.length) return;
    const ids = orders.map((o) => o.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => reorderMutation.mutate({ machineId, orderIds: ids }, { onError }));
  };

  return (
    <>
      <Header
        title="Planowanie"
        subtitle="Przypisanie zleceń do stanowisk, kolejność i kontrola obciążenia."
        action={
          <div className="flex gap-1.5">
            {HORIZONS.map((h) => (
              <button
                key={h.days}
                onClick={() => setDays(h.days)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  days === h.days
                    ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                    : "bg-muted text-foreground hover:bg-accent"
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        }
      />

      {actionError && (
        <div className="rounded-2xl bg-destructive/15 p-4 text-sm font-medium text-destructive">
          {actionError}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Obciążenie"
          value={totalCapacity > 0 ? `${Math.round((totalWork / totalCapacity) * 100)}%` : "—"}
          delta="Plan"
          note={`${fmtHours(totalWork)} z ${fmtHours(totalCapacity)}`}
          highlight
        />
        <KpiCard
          label="Przeciążone stanowiska"
          value={String(overloadedCount)}
          delta="Plan"
          note="praca ponad zdolność"
          warn={overloadedCount > 0}
        />
        <KpiCard
          label="Nierozplanowane"
          value={String(unassigned.length)}
          delta="Plan"
          note="czeka na stanowisko"
        />
        <KpiCard
          label="Bez wyceny czasu"
          value={String(withoutEstimate)}
          delta="Plan"
          note="brak czasu cyklu"
        />
      </section>

      {withoutEstimate > 0 && (
        <div className="flex items-start gap-2 rounded-2xl bg-primary/10 p-4 text-sm text-foreground">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            {withoutEstimate} zleceń nie ma czasu cyklu ani na zleceniu, ani jako normy maszyny —
            ich pracochłonność <strong>nie jest wliczona</strong> w obciążenie. Uzupełnij „Wzorcowy
            czas cyklu" na zleceniu lub maszynie, żeby plan był wiarygodny.
          </span>
        </div>
      )}

      {isLoading && (
        <div className="rounded-3xl bg-card p-8 text-center text-muted-foreground shadow-card">
          Ładowanie planu...
        </div>
      )}
      {error && (
        <div className="rounded-3xl bg-card p-8 text-center font-medium text-destructive shadow-card">
          Błąd pobierania planu!
        </div>
      )}

      <section className="space-y-4">
        {machines.map((machine) => (
          <div key={machine.machineId} className="rounded-3xl bg-card p-6 shadow-card">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{machine.name}</h3>
                  <span className="font-mono text-xs text-muted-foreground">
                    {machine.machineId}
                  </span>
                  {machine.overloaded && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                      <AlertTriangle className="h-3 w-3" /> przeciążone
                    </span>
                  )}
                </div>
                {machine.line && (
                  <div className="text-xs text-muted-foreground">{machine.line}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-foreground">
                  {fmtHours(machine.workMinutes)} / {fmtHours(machine.capacityMinutes)}
                </div>
                <div className="text-xs text-muted-foreground">
                  obciążenie {machine.loadPct}%
                  {machine.ordersWithoutEstimate > 0 &&
                    ` · ${machine.ordersWithoutEstimate} bez wyceny`}
                </div>
              </div>
            </div>

            <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${loadTone(machine.loadPct, machine.overloaded)}`}
                style={{ width: `${Math.min(100, machine.loadPct)}%` }}
              />
            </div>

            {machine.orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Brak zleceń w kolejce.
              </div>
            ) : (
              <ol className="space-y-2">
                {machine.orders.map((order, index) => (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {order.orderNumber}
                        </span>
                        <span className="text-sm text-foreground">{order.productName}</span>
                        {order.status === "in_progress" && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            w toku
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        zostało {order.remainingQuantity} z {order.quantity} szt. ·{" "}
                        {order.workMinutes !== null ? (
                          fmtHours(order.workMinutes)
                        ) : (
                          <span className="text-warning-foreground">brak wyceny czasu</span>
                        )}
                      </div>
                    </div>

                    {canPlan && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => move(machine.machineId, machine.orders, index, -1)}
                          disabled={index === 0 || reorderMutation.isPending}
                          className="rounded-lg bg-muted p-1.5 text-foreground hover:bg-accent disabled:opacity-30"
                          aria-label="Przesuń w górę"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => move(machine.machineId, machine.orders, index, 1)}
                          disabled={
                            index === machine.orders.length - 1 || reorderMutation.isPending
                          }
                          className="rounded-lg bg-muted p-1.5 text-foreground hover:bg-accent disabled:opacity-30"
                          aria-label="Przesuń w dół"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => assign(order.id, null)}
                          disabled={assignMutation.isPending}
                          className="rounded-lg bg-destructive/15 p-1.5 text-destructive hover:bg-destructive/30 disabled:opacity-30"
                          title="Zdejmij z planu"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-card">
        <h3 className="mb-1 text-lg font-semibold text-foreground">Nierozplanowane zlecenia</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Zlecenia bez przypisanego stanowiska. Wybierz maszynę, aby dopisać je na koniec jej
          kolejki.
        </p>

        {unassigned.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Wszystkie otwarte zlecenia mają przypisane stanowisko.
          </div>
        ) : (
          <div className="space-y-2">
            {unassigned.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {order.orderNumber}
                    </span>
                    <span className="text-sm text-foreground">{order.productName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {order.remainingQuantity} szt. do wykonania ·{" "}
                    {order.workMinutes !== null ? (
                      fmtHours(order.workMinutes)
                    ) : (
                      <span className="text-warning-foreground">brak wyceny czasu</span>
                    )}
                  </div>
                </div>

                {canPlan && (
                  <select
                    value=""
                    onChange={(e) => e.target.value && assign(order.id, e.target.value)}
                    className="rounded-2xl border border-border bg-muted p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">— przypisz do —</option>
                    {machines.map((m) => (
                      <option key={m.machineId} value={m.machineId}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
