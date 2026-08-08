import { useState } from "react";
import { OTHERS_KEY, type Slice } from "@/lib/analytics/model";

/**
 * Poziome słupki wielkości z etykietami bezpośrednimi.
 *
 * Etykieta i wartość stoją POZA pasmem koloru, w kolorze tekstu — nigdy
 * w kolorze serii. Kolor niesie tożsamość, tekst niesie treść; dzięki temu
 * wykres jest czytelny także wtedy, gdy odcieni nie da się rozróżnić.
 *
 * Kliknięcie emituje wartość wymiaru do filtra krzyżowego. Zaznaczone pozycje
 * zostają w pełnej sile, reszta przygasa — wykres nadal pokazuje wszystkie
 * kategorie, więc da się zmienić zdanie bez czyszczenia filtra.
 */
export function CategoryBars({
  slices,
  colorOf,
  isSelected,
  onSelect,
  formatValue,
  maxOverride,
  emptyMessage = "Brak danych w tym przekroju.",
}: {
  slices: Slice[];
  colorOf: (key: string) => string;
  isSelected: (key: string) => boolean;
  onSelect: (key: string, additive: boolean) => void;
  formatValue: (value: number) => string;
  maxOverride?: number;
  emptyMessage?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (slices.length === 0) {
    return (
      <div className="flex h-full min-h-[8rem] items-center justify-center text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const max = Math.max(maxOverride ?? 0, ...slices.map((s) => s.value), 1);
  const anySelected = slices.some((s) => isSelected(s.key));

  return (
    <ul className="space-y-3">
      {slices.map((slice) => {
        // „Pozostałe" to zwinięty ogon rankingu, a nie wartość wymiaru —
        // filtrowanie po nim nie miałoby sensu.
        const selectable = slice.key !== OTHERS_KEY;
        const selected = selectable && isSelected(slice.key);
        const dimmed = anySelected && !selected;
        const pct = (slice.value / max) * 100;

        return (
          <li key={slice.key}>
            <button
              type="button"
              disabled={!selectable}
              onMouseEnter={() => setHovered(slice.key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(slice.key)}
              onBlur={() => setHovered(null)}
              onClick={(e) => selectable && onSelect(slice.key, e.ctrlKey || e.metaKey)}
              aria-pressed={selected}
              className={`w-full rounded-xl px-1 py-1 text-left transition ${
                selectable ? "cursor-pointer hover:bg-muted/50" : "cursor-default"
              }`}
              title={
                selectable
                  ? `${slice.label}: ${formatValue(slice.value)} — kliknij, aby filtrować (Ctrl: wiele)`
                  : slice.label
              }
            >
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span
                  className={`min-w-0 truncate text-xs font-medium ${
                    selected ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {slice.label}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                  {formatValue(slice.value)}
                </span>
              </div>

              {/* Tor słupka jest recesywny; sam słupek ma zaokrąglony koniec
                  danych i pozostaje kwadratowy przy linii bazowej. */}
              <div className="h-2.5 w-full overflow-hidden rounded-l-[2px] rounded-r-[4px] bg-muted">
                <div
                  className="h-full rounded-l-[2px] rounded-r-[4px] transition-[width,opacity] duration-200"
                  style={{
                    width: `${Math.max(1.5, pct)}%`,
                    background: colorOf(slice.key),
                    opacity: dimmed ? 0.3 : hovered === slice.key ? 0.85 : 1,
                  }}
                />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
