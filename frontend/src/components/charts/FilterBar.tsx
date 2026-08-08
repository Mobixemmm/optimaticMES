import type { ReactNode } from "react";
import { X, Filter } from "lucide-react";
import { DIMENSION_LABEL, useCrossFilter, type FilterDimension } from "@/lib/analytics/filters";

/**
 * Aktywne filtry w jednym rzędzie nad wykresami — nigdy wewnątrz karty
 * wizualu i nigdy osobno per wykres. Filtr powstaje przez kliknięcie w dane,
 * więc bez tego paska użytkownik nie miałby jak zobaczyć, co właściwie
 * zawęził, ani tego cofnąć.
 */
export function FilterBar({
  days,
  onDaysChange,
  labelFor,
  trailing,
}: {
  days: number;
  onDaysChange: (days: number) => void;
  labelFor: (dimension: FilterDimension, value: string) => string;
  /** Sterowanie widokiem (nie filtrowaniem) dosunięte do prawej krawędzi paska. */
  trailing?: ReactNode;
}) {
  const { filters, remove, clear, activeCount } = useCrossFilter();
  const dimensions = Object.keys(filters) as FilterDimension[];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-card">
      {/* Zakres dat pierwszy — to filtr, po który sięga się najczęściej. */}
      <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
        {[7, 30, 90].map((option) => (
          <button
            key={option}
            onClick={() => onDaysChange(option)}
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

      <div className="mx-1 h-6 w-px bg-border" />

      <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

      {activeCount === 0 ? (
        <span className="text-xs text-muted-foreground">
          Kliknij dowolny słupek, aby zawęzić cały pulpit. Ctrl+klik zaznacza wiele.
        </span>
      ) : (
        <>
          {dimensions.flatMap((dimension) =>
            filters[dimension].map((value) => (
              <span
                key={`${dimension}:${value}`}
                className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-foreground"
              >
                <span className="opacity-70">{DIMENSION_LABEL[dimension]}:</span>
                <span className="min-w-0 truncate">{labelFor(dimension, value)}</span>
                <button
                  onClick={() => remove(dimension, value)}
                  className="shrink-0 rounded-full p-0.5 hover:bg-accent-foreground/15"
                  aria-label={`Usuń filtr ${DIMENSION_LABEL[dimension]}: ${labelFor(dimension, value)}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )),
          )}
          <button
            onClick={() => clear()}
            className="ml-1 rounded-full px-3 py-1 text-[11px] font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Wyczyść wszystko
          </button>
        </>
      )}

      {trailing && <div className="ml-auto shrink-0">{trailing}</div>}
    </div>
  );
}
