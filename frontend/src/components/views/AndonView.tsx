import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Siren, Check } from "lucide-react";
import { Header } from "@/components/shared/Header";
import { KpiCard } from "@/components/shared/KpiCard";
import { ChartCard, ChartEmpty } from "@/components/charts/ChartCard";
import { getAndonAlerts, resolveAndonAlert, deleteAndonAlert } from "@/lib/api";
import { useBootstrap } from "@/lib/bootstrap";

interface AndonAlert {
  id: number;
  type: string;
  machineId: string | null;
  message: string;
  tone: "err" | "warn" | "info";
  resolved: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

const TONE_STYLE: Record<string, string> = {
  err: "bg-destructive/15 text-destructive",
  warn: "bg-warning/20 text-warning-foreground",
  info: "bg-accent text-accent-foreground",
};

const TONE_LABEL: Record<string, string> = {
  err: "Krytyczne",
  warn: "Ostrzeżenie",
  info: "Informacja",
};

/**
 * Tablica Andon — druga pozycja pakietu bazowego obok rejestracji produkcji.
 * Wezwania powstają w panelu operatorskim; tutaj brygadzista je widzi i zamyka.
 */
export function AndonView() {
  const queryClient = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);
  const { can, moduleFlag } = useBootstrap();

  const { data: alerts = [] } = useQuery({
    queryKey: ["andon", showResolved],
    queryFn: () => getAndonAlerts(showResolved ? undefined : false),
    // Tablica Andon bez odświeżania jest tablicą historii, nie alarmem.
    refetchInterval: 10000,
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["andon"] });
  const resolveMutation = useMutation({ mutationFn: resolveAndonAlert, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: deleteAndonAlert, onSuccess: invalidate });

  const list = alerts as AndonAlert[];
  const open = list.filter((a) => !a.resolved);
  const critical = open.filter((a) => a.tone === "err");

  const allowResolve = moduleFlag("andon", "allowResolve") && can("andon.resolve");
  const allowDelete = moduleFlag("andon", "allowDelete") && can("andon.delete");

  const oldestMinutes =
    open.length === 0
      ? 0
      : Math.round(
          (Date.now() - Math.min(...open.map((a) => new Date(a.createdAt).getTime()))) / 60000,
        );

  return (
    <>
      <Header
        title="Andon"
        subtitle="Wezwania z hali w jednym miejscu. Zgłoszenie powstaje jednym dotknięciem na panelu przy maszynie."
        action={
          <button
            onClick={() => setShowResolved((v) => !v)}
            className="rounded-2xl bg-muted px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent"
          >
            {showResolved ? "Pokaż tylko otwarte" : "Pokaż też zamknięte"}
          </button>
        }
      />

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Otwarte wezwania"
          value={String(open.length)}
          delta="Live"
          note="czekają na reakcję"
          highlight
        />
        <KpiCard
          label="Krytyczne"
          value={String(critical.length)}
          delta="Live"
          note="maszyna stoi"
          warn={critical.length > 0}
        />
        <KpiCard
          label="Najdłużej otwarte"
          value={open.length === 0 ? "—" : `${oldestMinutes} min`}
          delta="Live"
          note="czas od zgłoszenia"
        />
      </section>

      <section className="mt-4">
        <ChartCard
          title={showResolved ? "Wszystkie wezwania" : "Otwarte wezwania"}
          subtitle={`${list.length} pozycji · odświeżane co 10 s`}
        >
          {list.length === 0 ? (
            <ChartEmpty message="Brak wezwań. To dobra wiadomość — zgłoszenia pojawią się tu w chwili, gdy operator naciśnie przycisk na panelu." />
          ) : (
            <ul className="flex flex-col gap-2">
              {list.map((alert) => (
                <li
                  key={alert.id}
                  className={`flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 ${
                    alert.resolved ? "bg-muted/40" : "bg-muted/70"
                  }`}
                >
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      TONE_STYLE[alert.tone] ?? TONE_STYLE.info
                    }`}
                  >
                    {TONE_LABEL[alert.tone] ?? alert.tone}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate text-sm font-semibold ${
                        alert.resolved ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {alert.message}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {alert.machineId ?? "bez maszyny"} ·{" "}
                      {new Date(alert.createdAt).toLocaleString("pl-PL", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {!alert.resolved && allowResolve && (
                    <button
                      onClick={() => resolveMutation.mutate(alert.id)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-success/20 px-3 py-2 text-xs font-bold text-success-foreground transition hover:bg-success/30"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Zamknij
                    </button>
                  )}
                  {alert.resolved && (
                    <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                      zamknięte
                    </span>
                  )}
                  {allowDelete && (
                    <button
                      onClick={() => deleteMutation.mutate(alert.id)}
                      className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-destructive transition hover:bg-destructive/15"
                    >
                      Usuń
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </section>

      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <Siren className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Wezwania zgłasza się kafelkiem „Wezwanie Andon" w panelu operatorskim — włącz go dla maszyny
        w Ustawieniach → Panele operatorskie.
      </p>
    </>
  );
}
