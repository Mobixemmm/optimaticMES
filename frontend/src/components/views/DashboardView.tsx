import { useState } from "react";
import { Clock, Gauge, CheckCircle2, Activity, Play, AlertTriangle } from "lucide-react";
import { useBootstrap } from "@/lib/bootstrap";
import { useAuth } from "@/lib/auth";
import { useOrdersQuery, useOrderMutations } from "@/hooks/use-orders";
import { useAnalyticsSummaryQuery } from "@/hooks/use-analytics";
import { resolveKpiAction } from "@/lib/analytics/kpi-actions";
import { Header } from "@/components/shared/Header";
import { KpiCard, type KpiDetailRow } from "@/components/shared/KpiCard";
import { OeeChart } from "@/components/shared/OeeChart";
import { QualityCard } from "@/components/shared/QualityCard";

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.round(minutes / 60)} h`;
}

export function DashboardView() {
  const { moduleFlag, moduleConfig } = useBootstrap();
  const { data: summary } = useAnalyticsSummaryQuery(30, { refetchInterval: 15000 });
  const { data: orders } = useOrdersQuery();
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);

  const dashboardConfig = moduleConfig("dashboard");
  const ordersList = Array.isArray(orders) ? orders : [];
  const activeOrders = ordersList.filter((o: any) => o.status === "in_progress").length;
  const pendingOrders = ordersList.filter((o: any) => o.status === "pending").length;
  const completedOrders = ordersList.filter((o: any) => o.status === "completed").length;

  // Klucz kafelka jest stały (KPI_REGISTRY) — to po nim panel administratora
  // przypisuje akcję kliknięcia, więc nie może zależeć od etykiety.
  const kpis: {
    key: string;
    label: string;
    value: string;
    delta: string;
    note: string;
    warn?: boolean;
    details: KpiDetailRow[];
  }[] = [
    {
      key: "oee",
      label: "OEE ogólne",
      value: summary ? `${summary.oee.overall}%` : "—",
      delta: "Live",
      note: "Dostępność × Wydajność × Jakość",
      details: [
        { label: "Dostępność", value: summary ? `${summary.oee.availability}%` : "—" },
        { label: "Wydajność", value: summary ? `${summary.oee.performance}%` : "—" },
        { label: "Jakość", value: summary ? `${summary.oee.quality}%` : "—" },
      ],
    },
    {
      key: "shiftProduced",
      label: "Wyprodukowane sztuki (zmiana)",
      value: summary ? summary.shift.produced.toLocaleString("pl-PL") : "—",
      delta: "Live",
      note: `Wobec planu ${summary ? summary.shift.planned.toLocaleString("pl-PL") : "—"}`,
      details: [
        {
          label: "Plan zmiany",
          value: summary ? summary.shift.planned.toLocaleString("pl-PL") : "—",
        },
        { label: "Realizacja", value: summary ? `${summary.shift.pct}%` : "—" },
        {
          label: "Do końca zmiany",
          value: summary ? formatMinutes(summary.shift.remainingMinutes) : "—",
        },
      ],
    },
    {
      key: "activeOrders",
      label: "Aktywne zlecenia",
      value: activeOrders.toString(),
      delta: "Live",
      note: "W tej chwili w toku",
      details: [
        { label: "Oczekujące", value: pendingOrders.toString() },
        { label: "W toku", value: activeOrders.toString() },
        { label: "Zakończone", value: completedOrders.toString() },
      ],
    },
    {
      key: "andon",
      label: "Alerty Andon",
      value: summary ? summary.andon.activeCount.toString() : "—",
      delta: "Live",
      note: "Otwarte zgłoszenia",
      warn: true,
      details: (summary?.andon.recent ?? []).slice(0, 4).map((alert: any) => ({
        label: alert.machineId ?? alert.type,
        value: timeAgo(alert.createdAt),
      })),
    },
  ];

  return (
    <>
      <Header
        title="Pulpit produkcji"
        subtitle="Monitoruj OEE, zlecenia i stan maszyn w czasie rzeczywistym."
      />
      {moduleFlag("dashboard", "showKpiCards") && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k, i) => {
            // Co robi kliknięcie, decyduje konfiguracja modułu — administrator
            // ustawia to per kafelek w Ustawieniach, bez zmiany kodu.
            const action = resolveKpiAction("dashboard", k.key, dashboardConfig);
            return (
              <KpiCard
                key={k.key}
                label={k.label}
                value={k.value}
                delta={k.delta}
                note={k.note}
                warn={k.warn}
                highlight={i === 0}
                action={action}
                details={k.details}
                expanded={expandedKpi === k.key}
                onActivate={() => setExpandedKpi((prev) => (prev === k.key ? null : k.key))}
              />
            );
          })}
        </section>
      )}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3 items-stretch">
        {moduleFlag("dashboard", "showOeeChart") && (
          <div className="xl:col-span-2">
            <OeeChart data={summary?.dailyAvailability ?? []} />
          </div>
        )}
        <ShiftCard
          planned={summary?.shift.planned ?? 0}
          produced={summary?.shift.produced ?? 0}
          pct={summary?.shift.pct ?? 0}
          remainingMinutes={summary?.shift.remainingMinutes ?? 0}
        />
      </section>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 items-stretch">
        <MachinesCard machines={summary?.machinesStatus ?? []} />
        <QualityCard
          qualityPct={summary?.oee.quality ?? 0}
          produced={summary?.production.produced ?? 0}
          scrap={summary?.production.scrap ?? 0}
        />
        <AndonCard
          alerts={summary?.andon.recent ?? []}
          activeCount={summary?.andon.activeCount ?? 0}
        />
      </section>
      <section className="grid grid-cols-1 gap-4">
        <OrdersCard orders={ordersList} />
      </section>
    </>
  );
}

function ShiftCard({
  planned,
  produced,
  pct,
  remainingMinutes,
}: {
  planned: number;
  produced: number;
  pct: number;
  remainingMinutes: number;
}) {
  return (
    <div className="flex h-full flex-col rounded-3xl bg-card p-6 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Postęp zmiany</h3>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="my-4 flex items-baseline gap-2">
        <div className="text-5xl font-bold text-primary">{pct}%</div>
        <div className="text-sm text-muted-foreground">planu</div>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-primary"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="mt-4 space-y-3 text-sm">
        {[
          { l: "Plan", v: `${planned.toLocaleString("pl-PL")} szt.`, i: Gauge },
          { l: "Wykonano", v: `${produced.toLocaleString("pl-PL")} szt.`, i: CheckCircle2 },
          { l: "Do końca zmiany", v: formatMinutes(remainingMinutes), i: Activity },
        ].map(({ l, v, i: Icon }) => (
          <div key={l} className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4" /> {l}
            </span>
            <span className="font-semibold text-foreground">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MachinesCard({
  machines,
}: {
  machines: { machineId: string; state: string; oeeApprox: number }[];
}) {
  const dot = (state: string) =>
    state === "Praca" ? "bg-success" : state === "Awaria" ? "bg-destructive" : "bg-warning";
  return (
    <div className="h-full rounded-3xl bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Stan maszyn</h3>
      </div>
      {machines.length === 0 && (
        <div className="text-sm text-muted-foreground">Brak danych z maszyn.</div>
      )}
      <ul className="space-y-3">
        {machines.map((m) => (
          <li key={m.machineId} className="flex items-center gap-3">
            <span className={`relative flex h-2.5 w-2.5 shrink-0 rounded-full ${dot(m.state)}`}>
              {m.state === "Praca" && (
                <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">{m.machineId}</div>
              <div className="text-xs text-muted-foreground">{m.state}</div>
            </div>
            <div className="text-right">
              <div
                className={`text-sm font-bold ${m.oeeApprox < 40 ? "text-destructive" : m.oeeApprox < 70 ? "text-warning-foreground" : "text-primary"}`}
              >
                {m.oeeApprox}%
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Dostępność 24h
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrdersCard({ orders }: { orders: any[] }) {
  const { permissions } = useAuth();
  const { statusMutation } = useOrderMutations();

  const badge = (status: string) =>
    status === "completed"
      ? "bg-success/15 text-success"
      : status === "in_progress"
        ? "bg-primary/10 text-primary"
        : status === "cancelled"
          ? "bg-destructive/15 text-destructive"
          : "bg-muted text-muted-foreground";

  const visible = orders.slice(0, 6);

  return (
    <div className="rounded-3xl bg-card p-6 shadow-card h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Zlecenia produkcyjne</h3>
          <p className="text-xs text-muted-foreground">Aktualnie realizowane na hali</p>
        </div>
      </div>
      {visible.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground border border-dashed rounded-2xl">
          Brak zleceń w bazie danych.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Nr</th>
                <th className="px-4 py-3 font-semibold">Produkt</th>
                <th className="px-4 py-3 font-semibold">Postęp</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                {permissions.canChangeOrderStatus && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => {
                const done = o.producedQuantity || 0;
                const total = o.quantity || 1;
                const pct = Math.min(100, Math.round((done / total) * 100));
                return (
                  <tr key={o.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                      {o.orderNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{o.productName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-gradient-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {done} / {total}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge(o.status)}`}
                      >
                        {o.status || "pending"}
                      </span>
                    </td>
                    {permissions.canChangeOrderStatus && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() =>
                              statusMutation.mutate({ id: o.id, status: "in_progress" })
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground hover:bg-accent"
                            title="Rozpocznij"
                          >
                            <Play className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => statusMutation.mutate({ id: o.id, status: "completed" })}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground hover:bg-accent"
                            title="Zakończ"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AndonCard({
  alerts,
  activeCount,
}: {
  alerts: {
    id: number;
    type: string;
    message: string;
    tone: "err" | "warn" | "info";
    createdAt: string;
  }[];
  activeCount: number;
}) {
  const styles = {
    err: "border-destructive/30 bg-destructive/5 text-destructive",
    warn: "border-warning/40 bg-warning/10 text-warning-foreground",
    info: "border-border bg-muted text-foreground",
  } as const;
  return (
    <div className="h-full rounded-3xl bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Andon — zgłoszenia</h3>
          <p className="text-xs text-muted-foreground">Ostatnie zgłoszenia z bazy danych</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
          <AlertTriangle className="h-3 w-3" /> {activeCount} aktywne
        </span>
      </div>
      {alerts.length === 0 ? (
        <div className="text-sm text-muted-foreground">Brak zgłoszeń Andon.</div>
      ) : (
        <ul className="space-y-2.5">
          {alerts.slice(0, 4).map((a) => (
            <li
              key={a.id}
              className={`flex items-start gap-3 rounded-2xl border p-3 ${styles[a.tone]}`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-background/60">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">{a.type}</span>
                  <span className="text-[11px] opacity-70">· {timeAgo(a.createdAt)} temu</span>
                </div>
                <div className="mt-0.5 truncate text-sm font-medium text-foreground">
                  {a.message}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
