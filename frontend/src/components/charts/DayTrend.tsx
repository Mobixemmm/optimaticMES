import { useState } from "react";
import { formatDayLabel, formatMinutes } from "@/lib/analytics/model";
import { reasonLabel } from "@/lib/analytics/palette";
import { useLegendColors } from "@/lib/analytics/legend-colors";

export interface DayColumn {
  date: string;
  total: number;
  segments: { reason: string; minutes: number }[];
}

/**
 * Przestoje dzień po dniu, w rozbiciu na przyczyny.
 *
 * To jedyny wizual, w którym paleta kategorialna niesie tożsamość w wielu
 * segmentach naraz — te same odcienie co na wykresie przyczyn, więc kolor
 * „Awarii" znaczy to samo na obu. Segmenty rozdziela 2 px przerwy w kolorze
 * powierzchni; obramowań nie rysujemy.
 */
export function DayTrend({
  columns,
  isSelected,
  onSelect,
  emptyMessage = "Brak przestojów w tym okresie.",
}: {
  columns: DayColumn[];
  isSelected: (date: string) => boolean;
  onSelect: (date: string, additive: boolean) => void;
  emptyMessage?: string;
}) {
  const [hovered, setHovered] = useState<DayColumn | null>(null);
  // Odcienie przyczyn: domyślne z motywu albo przemalowane przez użytkownika.
  const { colorOf: reasonColor } = useLegendColors();

  const max = Math.max(1, ...columns.map((c) => c.total));
  const anySelected = columns.some((c) => isSelected(c.date));
  const reasonsPresent = [...new Set(columns.flatMap((c) => c.segments.map((s) => s.reason)))];

  if (columns.length === 0 || max <= 1) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1">
        {hovered && (
          <div className="pointer-events-none absolute right-0 top-0 z-10 min-w-[11rem] rounded-xl border border-border bg-popover p-3 shadow-card">
            <div className="text-xs font-semibold text-popover-foreground">
              {formatDayLabel(hovered.date)}
            </div>
            {/* Wartość prowadzi, nazwa serii idzie za nią — w tooltipie
                czytelnik ma już kategorię i szuka liczby. */}
            <div className="mt-1 text-lg font-bold tabular-nums text-popover-foreground">
              {formatMinutes(hovered.total)}
            </div>
            <ul className="mt-2 space-y-1">
              {hovered.segments
                .filter((s) => s.minutes > 0)
                .sort((a, b) => b.minutes - a.minutes)
                .map((s) => (
                  <li
                    key={s.reason}
                    className="flex items-center gap-2 text-[11px] text-muted-foreground"
                  >
                    <span
                      className="h-0.5 w-3 shrink-0 rounded-full"
                      style={{ background: reasonColor(s.reason) }}
                    />
                    <span className="min-w-0 flex-1 truncate">{reasonLabel(s.reason)}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-popover-foreground">
                      {formatMinutes(s.minutes)}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="flex h-56 items-end gap-1.5">
          {columns.map((col) => {
            const selected = isSelected(col.date);
            const dimmed = anySelected && !selected;
            const heightPct = (col.total / max) * 100;

            return (
              <button
                key={col.date}
                type="button"
                onMouseEnter={() => setHovered(col)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(col)}
                onBlur={() => setHovered(null)}
                onClick={(e) => onSelect(col.date, e.ctrlKey || e.metaKey)}
                aria-pressed={selected}
                title={`${formatDayLabel(col.date)}: ${formatMinutes(col.total)} — kliknij, aby filtrować`}
                // Cel trafienia to cała kolumna łącznie z powietrzem nad
                // słupkiem, nie same pomalowane piksele.
                className="group flex h-full flex-1 cursor-pointer flex-col justify-end rounded-t-lg transition hover:bg-muted/40"
              >
                <div
                  className="mx-auto flex w-full max-w-[24px] flex-col-reverse justify-start overflow-hidden rounded-t-[4px] transition-opacity"
                  style={{ height: `${Math.max(2, heightPct)}%`, opacity: dimmed ? 0.3 : 1 }}
                >
                  {col.segments
                    .filter((s) => s.minutes > 0)
                    .map((s, i) => (
                      <div
                        key={s.reason}
                        style={{
                          height: `${(s.minutes / col.total) * 100}%`,
                          background: reasonColor(s.reason),
                          // 2 px przerwy w kolorze powierzchni między segmentami
                          // — rozdzielamy przerwą, nie obwódką.
                          marginTop: i === 0 ? 0 : 2,
                        }}
                      />
                    ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Przy szerokim zakresie podpisujemy co n-tą kolumnę — etykieta na
          każdej zlałaby się w pasek nieczytelnych cyfr. Zaznaczony dzień
          dostaje podpis zawsze, żeby było wiadomo, co się kliknęło. */}
      <div className="mt-2 flex gap-1.5">
        {columns.map((col, i) => {
          const step = Math.ceil(columns.length / 12);
          const selected = isSelected(col.date);
          const showLabel = columns.length <= 16 || i % step === 0 || selected;
          return (
            <div
              key={col.date}
              className={`flex-1 text-center text-[9px] tabular-nums ${
                selected ? "font-bold text-foreground" : "font-medium text-muted-foreground"
              }`}
            >
              {showLabel ? formatDayLabel(col.date) : " "}
            </div>
          );
        })}
      </div>

      {/* Legenda jest zawsze obecna przy dwóch i więcej seriach — tożsamość
          nie może zależeć wyłącznie od koloru. */}
      {reasonsPresent.length >= 2 && (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border/60 pt-3">
          {reasonsPresent.map((reason) => (
            <li
              key={reason}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ background: reasonColor(reason) }}
              />
              {reasonLabel(reason)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
