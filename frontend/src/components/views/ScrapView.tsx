import { useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Header } from "@/components/shared/Header";
import { KpiCard } from "@/components/shared/KpiCard";
import { ChartCard, ChartEmpty } from "@/components/charts/ChartCard";
import { CategoryBars } from "@/components/charts/CategoryBars";
import { MAGNITUDE_COLOR } from "@/lib/analytics/palette";
import {
  useScrapCategoriesQuery,
  useScrapEventsQuery,
  useScrapMutations,
  useScrapSummaryQuery,
} from "@/hooks/use-scrap";
import { useBootstrap } from "@/lib/bootstrap";

const SOURCE_LABEL: Record<string, string> = {
  operator: "Operator",
  telemetry: "Czujnik",
};

export function ScrapView() {
  const [days, setDays] = useState(30);
  const { data: summary } = useScrapSummaryQuery(days);
  const { data: events = [] } = useScrapEventsQuery(days);
  const { data: categories = [] } = useScrapCategoriesQuery();
  const { reclassifyMutation, deleteMutation } = useScrapMutations();
  const { can, moduleFlag } = useBootstrap();

  const allowDelete = moduleFlag("scrap", "allowDelete") && can("scrap.delete");
  const canReclassify = can("scrap.report");

  const labelOfCategory = new Map(categories.map((c) => [c.code, c.label]));
  const total = summary?.totalQuantity ?? 0;

  return (
    <>
      <Header
        title="Odrzut (SCRAP)"
        subtitle="Rejestracja i kategoryzacja braków. Licznik z czujnika zna liczbę, operator zna przyczynę — moduł łączy jedno z drugim."
        action={
          <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
            {[7, 30, 90].map((option) => (
              <button
                key={option}
                onClick={() => setDays(option)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  days === option
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option} dni
              </button>
            ))}
          </div>
        }
      />

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Odrzut łącznie"
          value={total.toLocaleString("pl-PL")}
          delta="szt."
          note={`${days} dni`}
          highlight
        />
        <KpiCard
          label="Z przycisku operatora"
          value={(summary?.fromOperator ?? 0).toLocaleString("pl-PL")}
          delta="szt."
          note="z podaną przyczyną"
        />
        <KpiCard
          label="Z czujnika"
          value={(summary?.fromTelemetry ?? 0).toLocaleString("pl-PL")}
          delta="szt."
          note="import z logów maszyny"
        />
        <KpiCard
          label="Bez przyczyny"
          value={(summary?.unclassifiedQuantity ?? 0).toLocaleString("pl-PL")}
          delta="szt."
          note="czeka na kategoryzację"
        />
      </section>

      {(summary?.unclassifiedQuantity ?? 0) > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-warning/15 px-4 py-3 text-xs text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Część odrzutu przyszła z czujnika bez przyczyny. Sam licznik mówi tylko,{" "}
            <strong>ile</strong> — dopóki ktoś nie nada kategorii, nie wiadomo, co poprawić.
            Przyczynę nadasz w tabeli poniżej.
          </span>
        </div>
      )}

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Przyczyny odrzutu"
          subtitle="Udział w sztukach"
          tableColumns={["Przyczyna", "Sztuki"]}
          tableRows={(summary?.byCategory ?? []).map((c) => ({
            label: c.label,
            value: c.quantity.toLocaleString("pl-PL"),
            extra: `${c.pct}%`,
          }))}
        >
          {(summary?.byCategory.length ?? 0) === 0 ? (
            <ChartEmpty message="Brak zgłoszeń odrzutu w tym okresie." />
          ) : (
            <CategoryBars
              slices={(summary?.byCategory ?? []).map((c) => ({
                key: c.code,
                label: c.label,
                value: c.quantity,
              }))}
              colorOf={() => MAGNITUDE_COLOR}
              isSelected={() => false}
              onSelect={() => {}}
              formatValue={(v) => `${v.toLocaleString("pl-PL")} szt.`}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Odrzut wg maszyn"
          subtitle="Gdzie powstają braki"
          tableColumns={["Maszyna", "Sztuki"]}
          tableRows={(summary?.byMachine ?? []).map((m) => ({
            label: m.machineId,
            value: m.quantity.toLocaleString("pl-PL"),
          }))}
        >
          {(summary?.byMachine.length ?? 0) === 0 ? (
            <ChartEmpty message="Brak zgłoszeń odrzutu w tym okresie." />
          ) : (
            <CategoryBars
              slices={(summary?.byMachine ?? []).slice(0, 12).map((m) => ({
                key: m.machineId,
                label: m.machineId,
                value: m.quantity,
              }))}
              colorOf={() => MAGNITUDE_COLOR}
              isSelected={() => false}
              onSelect={() => {}}
              formatValue={(v) => `${v.toLocaleString("pl-PL")} szt.`}
            />
          )}
        </ChartCard>
      </section>

      <section className="mt-4">
        <ChartCard
          title="Zgłoszenia odrzutu"
          subtitle={`${events.length} zgłoszeń · przyczynę można zmienić w każdej chwili`}
        >
          {events.length === 0 ? (
            <ChartEmpty message="Brak zgłoszeń. Odrzut trafia tu z przycisku w panelu operatorskim albo z licznika maszyny — źródło ustawia się per maszyna w Ustawieniach." />
          ) : (
            <div className="max-h-[32rem] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 pr-3 font-semibold">Kiedy</th>
                    <th className="pb-2 pr-3 font-semibold">Maszyna</th>
                    <th className="pb-2 pr-3 font-semibold">Sztuki</th>
                    <th className="pb-2 pr-3 font-semibold">Źródło</th>
                    <th className="pb-2 pr-3 font-semibold">Przyczyna</th>
                    {allowDelete && <th className="pb-2 font-semibold" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {events.map((event) => {
                    const isUnclassified =
                      event.categoryCode === null || event.categoryCode === "UNCLASSIFIED";
                    return (
                      <tr key={event.id} className="hover:bg-muted/40">
                        <td className="whitespace-nowrap py-2 pr-3 tabular-nums text-muted-foreground">
                          {new Date(event.recordedAt).toLocaleString("pl-PL", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2 pr-3 font-medium text-foreground">{event.machineId}</td>
                        <td className="py-2 pr-3 font-semibold tabular-nums text-foreground">
                          {Number(event.quantity).toLocaleString("pl-PL")}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              event.source === "telemetry"
                                ? "bg-muted text-muted-foreground"
                                : "bg-accent text-accent-foreground"
                            }`}
                          >
                            {SOURCE_LABEL[event.source] ?? event.source}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          {canReclassify ? (
                            <select
                              value={event.categoryCode ?? "UNCLASSIFIED"}
                              onChange={(e) =>
                                reclassifyMutation.mutate({
                                  id: event.id,
                                  categoryCode: e.target.value,
                                })
                              }
                              className={`rounded-lg border border-border bg-muted/60 px-2 py-1 text-xs font-medium outline-none ${
                                isUnclassified ? "text-warning-foreground" : "text-foreground"
                              }`}
                            >
                              {categories.map((category) => (
                                <option key={category.code} value={category.code}>
                                  {category.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={isUnclassified ? "text-warning-foreground" : ""}>
                              {labelOfCategory.get(event.categoryCode ?? "") ??
                                "Bez przypisanej przyczyny"}
                            </span>
                          )}
                        </td>
                        {allowDelete && (
                          <td className="py-2 text-right">
                            <button
                              onClick={() => deleteMutation.mutate(event.id)}
                              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-destructive transition hover:bg-destructive/15"
                            >
                              Usuń
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </section>

      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Odrzut z czujników doczytuje się przy każdym wejściu na tę zakładkę — import jest
        idempotentny, więc nie da się policzyć tej samej sztuki dwa razy.
      </p>
    </>
  );
}
