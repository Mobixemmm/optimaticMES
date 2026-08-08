import { useMemo, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Header } from "@/components/shared/Header";
import { KpiCard, type KpiDetailRow } from "@/components/shared/KpiCard";
import { ChartCard, ChartEmpty } from "@/components/charts/ChartCard";
import { CategoryBars } from "@/components/charts/CategoryBars";
import { DayTrend, type DayColumn } from "@/components/charts/DayTrend";
import { FilterBar } from "@/components/charts/FilterBar";
import { LegendColorPicker } from "@/components/charts/LegendColorPicker";
import { useAnalyticsDatasetQuery } from "@/hooks/use-analytics";
import { useBootstrap } from "@/lib/bootstrap";
import { CrossFilterProvider } from "@/lib/analytics/filter-provider";
import { LegendColorProvider } from "@/lib/analytics/legend-color-provider";
import { useCrossFilter, type FilterDimension } from "@/lib/analytics/filters";
import { useLegendColors } from "@/lib/analytics/legend-colors";
import {
  computeKpis,
  dayKey,
  filterStops,
  formatDayLabel,
  formatMinutes,
  indexMachines,
  ordersIgnoreActiveFilters,
  sumBy,
  topNWithOthers,
} from "@/lib/analytics/model";
import { MAGNITUDE_COLOR, reasonLabel } from "@/lib/analytics/palette";
import { resolveKpiAction } from "@/lib/analytics/kpi-actions";

const MACHINE_BAR_LIMIT = 12;

export function AnalyticsView() {
  // Provider filtrów trzyma stan zawężeń dla całej strony — to on sprawia, że
  // wizuale filtrują się nawzajem, zamiast każdy mieć własny, niezależny stan.
  // Provider kolorów robi to samo dla tożsamości barwnej: jeden zestaw odcieni
  // dla wszystkich wizuali, pobrany z preferencji zalogowanego użytkownika.
  return (
    <CrossFilterProvider>
      <LegendColorProvider>
        <AnalyticsDashboard />
      </LegendColorProvider>
    </CrossFilterProvider>
  );
}

function AnalyticsDashboard() {
  const [days, setDays] = useState(30);
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);
  const { dataset, isFetching } = useAnalyticsDatasetQuery(days, {
    refetchInterval: 30000,
  });
  const { filters, toggle, isSelected, hasSelection, clear } = useCrossFilter();
  const { colorOf: reasonColor } = useLegendColors();
  const { moduleConfig, t } = useBootstrap();

  const analyticsConfig = moduleConfig("analytics");
  const machineIndex = useMemo(() => indexMachines(dataset.machines), [dataset.machines]);
  const kpis = useMemo(
    () => computeKpis(dataset, filters, machineIndex),
    [dataset, filters, machineIndex],
  );

  // Każdy wizual dostaje dane policzone BEZ filtra na własnym wymiarze —
  // dlatego po kliknięciu w kategorię nadal widać pozostałe i da się zmienić
  // wybór (patrz filterStops w lib/analytics/model.ts).
  const reasonSlices = useMemo(() => {
    const stops = filterStops(dataset.stops, filters, machineIndex, "reason");
    return sumBy(
      stops.filter((s) => s.reason !== "planned"),
      (s) => s.reason,
      reasonLabel,
    );
  }, [dataset.stops, filters, machineIndex]);

  const machineSlices = useMemo(() => {
    const stops = filterStops(dataset.stops, filters, machineIndex, "machine");
    const all = sumBy(
      stops.filter((s) => s.reason !== "planned"),
      (s) => s.machineId,
      (key) => machineIndex.get(key)?.name ?? key,
    );
    return topNWithOthers(all, MACHINE_BAR_LIMIT);
  }, [dataset.stops, filters, machineIndex]);

  const lineSlices = useMemo(() => {
    const stops = filterStops(dataset.stops, filters, machineIndex, "line");
    const all = sumBy(
      stops.filter((s) => s.reason !== "planned"),
      (s) => machineIndex.get(s.machineId)?.line ?? null,
      (key) => key,
    );
    return topNWithOthers(all, 8);
  }, [dataset.stops, filters, machineIndex]);

  const dayColumns = useMemo<DayColumn[]>(() => {
    const stops = filterStops(dataset.stops, filters, machineIndex, "day");
    const byDay = new Map<string, Map<string, number>>();
    for (const stop of stops) {
      const key = dayKey(stop.startTime);
      const bucket = byDay.get(key) ?? new Map<string, number>();
      bucket.set(stop.reason, (bucket.get(stop.reason) ?? 0) + stop.minutes);
      byDay.set(key, bucket);
    }
    // Oś czasu bierzemy z kalendarza, nie z samych zdarzeń — dzień bez
    // przestoju to informacja (zero), a nie dziura w wykresie.
    return dataset.plannedMinutesByDay.map((day) => {
      const bucket = byDay.get(day.date) ?? new Map<string, number>();
      const segments = [...bucket.entries()].map(([reason, minutes]) => ({
        reason,
        minutes,
      }));
      return {
        date: day.date,
        total: segments.reduce((s, seg) => s + seg.minutes, 0),
        segments,
      };
    });
  }, [dataset.stops, dataset.plannedMinutesByDay, filters, machineIndex]);

  // Tabela szczegółów honoruje WSZYSTKIE filtry — to jest ten wizual, który
  // pokazuje konkretne zdarzenia stojące za każdym słupkiem.
  const detailStops = useMemo(
    () =>
      filterStops(dataset.stops, filters, machineIndex)
        .slice()
        .sort((a, b) => b.startTime.localeCompare(a.startTime))
        .slice(0, 60),
    [dataset.stops, filters, machineIndex],
  );

  const orderBlindDimensions = ordersIgnoreActiveFilters(filters);

  const labelFor = (dimension: FilterDimension, value: string): string => {
    if (dimension === "machine") return machineIndex.get(value)?.name ?? value;
    if (dimension === "reason") return reasonLabel(value);
    if (dimension === "day") return formatDayLabel(value);
    return value;
  };

  const kpiDetails: Record<string, KpiDetailRow[]> = {
    oee: [
      { label: "Dostępność", value: `${kpis.availability}%` },
      { label: "Wydajność", value: `${kpis.performance}%` },
      { label: "Jakość", value: `${kpis.quality}%` },
      { label: "Maszyn w przekroju", value: String(kpis.machineCount) },
    ],
    availability: [
      { label: "Czas przestoju", value: formatMinutes(kpis.downtimeMinutes) },
      { label: "Czas planowany", value: formatMinutes(kpis.plannedMinutes) },
      { label: "Awarie", value: String(kpis.failureCount) },
      { label: "Przestoje otwarte", value: String(kpis.openStops) },
    ],
    performance: [
      { label: "Wyprodukowano", value: kpis.produced.toLocaleString("pl-PL") },
      {
        label: "Metoda",
        value:
          kpis.performanceMethod === "cycle_time"
            ? "wzorcowy czas cyklu"
            : "przybliżenie wykonane/plan",
      },
      {
        label: "Czas pracy",
        value: formatMinutes(Math.max(0, kpis.plannedMinutes - kpis.downtimeMinutes)),
      },
    ],
    quality: [
      { label: "Dobre sztuki", value: kpis.good.toLocaleString("pl-PL") },
      { label: "Braki", value: kpis.scrap.toLocaleString("pl-PL") },
      { label: "Wyprodukowano", value: kpis.produced.toLocaleString("pl-PL") },
    ],
  };

  const kpiTiles = [
    { key: "oee", label: "OEE ogólne", value: `${kpis.overall}%`, highlight: true },
    { key: "availability", label: "Dostępność", value: `${kpis.availability}%` },
    { key: "performance", label: "Wydajność", value: `${kpis.performance}%` },
    { key: "quality", label: "Jakość (FPY)", value: `${kpis.quality}%` },
  ];

  const hasAnyFilter = Object.values(filters).some((v) => v.length > 0);
  const kpiNote = hasAnyFilter ? "wybrany przekrój" : `${days} dni`;

  return (
    <>
      <Header
        title="Analityka produkcji"
        subtitle="Kliknij dowolny słupek — pozostałe wizuale i kafelki przeliczą się na ten sam przekrój."
      />

      <FilterBar
        days={days}
        onDaysChange={setDays}
        labelFor={labelFor}
        trailing={<LegendColorPicker />}
      />

      {/* Przeładowanie danych nie może rozbijać układu — wykresy trzymają
          poprzedni render przy zmniejszonej sile, bez szkieletu i przeskoku. */}
      <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiTiles.map((tile) => {
            const action = resolveKpiAction("analytics", tile.key, analyticsConfig);
            return (
              <KpiCard
                key={tile.key}
                label={tile.label}
                value={tile.value}
                delta="Live"
                note={kpiNote}
                highlight={tile.highlight}
                action={action}
                details={kpiDetails[tile.key]}
                expanded={expandedKpi === tile.key}
                onActivate={() => {
                  if (action.type === "drilldown") {
                    setExpandedKpi((prev) => (prev === tile.key ? null : tile.key));
                  } else if (action.type === "filter" && action.dimension && action.value) {
                    toggle(action.dimension, action.value, false);
                  }
                }}
              />
            );
          })}
        </section>

        {kpis.performanceMethod === "quantity_ratio" && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-warning/15 px-4 py-3 text-xs text-warning-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Wydajność liczona przybliżeniem <strong>wykonane / zaplanowane</strong> — żadne
              zlecenie w tym przekroju nie ma wzorcowego czasu cyklu, bez którego nie da się
              policzyć jej zgodnie z definicją OEE.
            </span>
          </div>
        )}

        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <ChartCard
            className="xl:col-span-2"
            title="Przestoje dzień po dniu"
            subtitle="Minuty przestoju w rozbiciu na przyczyny · kliknij dzień, aby zawęzić"
            selectionNote={
              hasSelection("day")
                ? `Zawężono do dni: ${filters.day.map(formatDayLabel).join(", ")}`
                : null
            }
            onClearSelection={() => clear("day")}
            tableColumns={["Dzień", "Przestój"]}
            tableRows={dayColumns
              .filter((c) => c.total > 0)
              .map((c) => ({ label: formatDayLabel(c.date), value: formatMinutes(c.total) }))}
          >
            <DayTrend
              columns={dayColumns}
              isSelected={(date) => isSelected("day", date)}
              onSelect={(date, additive) => toggle("day", date, additive)}
            />
          </ChartCard>

          <ChartCard
            title="Przyczyny strat"
            subtitle="Udział czasu przestoju · kliknij przyczynę"
            selectionNote={
              hasSelection("reason")
                ? `Zawężono do: ${filters.reason.map(reasonLabel).join(", ")}`
                : null
            }
            onClearSelection={() => clear("reason")}
            tableColumns={["Przyczyna", "Przestój"]}
            tableRows={reasonSlices.map((s) => ({
              label: s.label,
              value: formatMinutes(s.value),
            }))}
          >
            <CategoryBars
              slices={reasonSlices}
              // Jedna seria (minuty) w przekroju nominalnym — dokładnie ten sam
              // przypadek co „Maszyny — przestoje" niżej, więc ten sam jeden
              // odcień. Kolorowanie każdej przyczyny osobno wydawało kanał
              // tożsamości na powtórzenie tego, co już mówi długość słupka;
              // przyczynę nazywa etykieta przy słupku. Tożsamość barwna została
              // tam, gdzie jest naprawdę potrzebna — na stosie w DayTrend.
              colorOf={() => MAGNITUDE_COLOR}
              isSelected={(key) => isSelected("reason", key)}
              onSelect={(key, additive) => toggle("reason", key, additive)}
              formatValue={formatMinutes}
              emptyMessage="Brak przestojów w tym przekroju."
            />
          </ChartCard>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            // Terminologia jest konfigurowalna i nie da się jej odmieniać przez
            // przypadki, więc tytuł stawia termin w mianowniku i dopisuje resztę
            // po myślniku — działa dla „Maszyny", „Stanowiska" i „Urządzenia".
            title={`${t("assetPlural", "Maszyny")} — przestoje`}
            subtitle="Czoło rankingu · kliknij, aby zawęzić"
            selectionNote={
              hasSelection("machine")
                ? `Zawężono do: ${filters.machine
                    .map((m) => machineIndex.get(m)?.name ?? m)
                    .join(", ")}`
                : null
            }
            onClearSelection={() => clear("machine")}
            tableColumns={["Maszyna", "Przestój"]}
            tableRows={machineSlices.map((s) => ({
              label: s.label,
              value: formatMinutes(s.value),
            }))}
          >
            <CategoryBars
              slices={machineSlices}
              // Jedna seria, wielkość a nie tożsamość — jeden odcień, bez legendy.
              colorOf={() => MAGNITUDE_COLOR}
              isSelected={(key) => isSelected("machine", key)}
              onSelect={(key, additive) => toggle("machine", key, additive)}
              formatValue={formatMinutes}
              emptyMessage="Żadna maszyna nie zgłosiła przestoju w tym przekroju."
            />
          </ChartCard>

          <ChartCard
            title={`${t("area", "Linia")} — przestoje`}
            subtitle="Kliknij, aby zawęzić do obszaru"
            selectionNote={hasSelection("line") ? `Zawężono do: ${filters.line.join(", ")}` : null}
            onClearSelection={() => clear("line")}
            tableColumns={["Linia", "Przestój"]}
            tableRows={lineSlices.map((s) => ({
              label: s.label,
              value: formatMinutes(s.value),
            }))}
          >
            {lineSlices.length === 0 ? (
              <ChartEmpty message="Maszyny nie mają przypisanej linii ani obszaru — uzupełnij je w module maszyn, żeby ten przekrój miał treść." />
            ) : (
              <CategoryBars
                slices={lineSlices}
                colorOf={() => MAGNITUDE_COLOR}
                isSelected={(key) => isSelected("line", key)}
                onSelect={(key, additive) => toggle("line", key, additive)}
                formatValue={formatMinutes}
              />
            )}
          </ChartCard>
        </section>

        {orderBlindDimensions.length > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Kafelki <strong>Wydajność</strong> i <strong>Jakość</strong> liczą się ze zleceń, a te
              nie są w modelu danych powiązane z maszyną ani linią — aktywny filtr ich nie zawęża.
              Pozostałe wizuale respektują go w całości.
            </span>
          </div>
        )}

        <section className="mt-4">
          <ChartCard
            title="Zdarzenia przestoju"
            subtitle={`${detailStops.length} zdarzeń w bieżącym przekroju${
              detailStops.length === 60 ? " (pokazano 60 najnowszych)" : ""
            }`}
          >
            {detailStops.length === 0 ? (
              <ChartEmpty message="Brak zdarzeń spełniających wybrane filtry." />
            ) : (
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="pb-2 pr-3 font-semibold">Start</th>
                      <th className="pb-2 pr-3 font-semibold">Maszyna</th>
                      <th className="pb-2 pr-3 font-semibold">Przyczyna</th>
                      <th className="pb-2 pr-3 font-semibold">Czas</th>
                      <th className="pb-2 font-semibold">Notatka</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {detailStops.map((stop) => (
                      <tr key={stop.id} className="hover:bg-muted/40">
                        <td className="whitespace-nowrap py-2 pr-3 tabular-nums text-muted-foreground">
                          {new Date(stop.startTime).toLocaleString("pl-PL", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2 pr-3 font-medium text-foreground">
                          {machineIndex.get(stop.machineId)?.name ?? stop.machineId}
                        </td>
                        <td className="py-2 pr-3">
                          {/* Kolor obok tekstu, nigdy zamiast tekstu. */}
                          <span className="inline-flex items-center gap-1.5 text-foreground">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                              style={{ background: reasonColor(stop.reason) }}
                            />
                            {reasonLabel(stop.reason)}
                          </span>
                        </td>
                        <td className="py-2 pr-3 font-semibold tabular-nums text-foreground">
                          {stop.endTime ? (
                            formatMinutes(stop.minutes)
                          ) : (
                            <span className="text-warning-foreground">
                              {formatMinutes(stop.minutes)} · trwa
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-muted-foreground">{stop.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        </section>
      </div>
    </>
  );
}
