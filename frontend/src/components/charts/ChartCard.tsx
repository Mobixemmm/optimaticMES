import { useState, type ReactNode } from "react";
import { Table2, BarChart3, X } from "lucide-react";

export interface ChartTableRow {
  label: string;
  value: string;
  extra?: string;
}

/**
 * Powłoka każdego wizualu: tytuł, podtytuł, przełącznik widoku tabelarycznego
 * i wskazanie aktywnego zaznaczenia.
 *
 * Widok tabelaryczny nie jest ozdobnikiem — część slotów palety kategorialnej
 * nie dobija w trybie jasnym do kontrastu 3:1 wobec białej karty, a wtedy
 * obowiązuje zasada ulgi: wartości muszą być czytelne bez rozróżniania kolorów.
 * Realizują ją etykiety bezpośrednie na wykresach i właśnie ta tabela.
 */
export function ChartCard({
  title,
  subtitle,
  selectionNote,
  onClearSelection,
  tableRows,
  tableColumns = ["Kategoria", "Wartość"],
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  selectionNote?: string | null;
  onClearSelection?: () => void;
  tableRows?: ChartTableRow[];
  tableColumns?: [string, string] | string[];
  children: ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className={`flex h-full flex-col rounded-3xl bg-card p-6 shadow-card ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        {tableRows && (
          <button
            onClick={() => setShowTable((v) => !v)}
            className="shrink-0 rounded-xl border border-border bg-muted/60 p-1.5 text-muted-foreground transition hover:text-foreground"
            title={showTable ? "Pokaż wykres" : "Pokaż jako tabelę"}
            aria-label={showTable ? "Pokaż wykres" : "Pokaż jako tabelę"}
          >
            {showTable ? <BarChart3 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
          </button>
        )}
      </div>

      {selectionNote && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-accent/60 px-3 py-1.5 text-[11px] font-semibold text-accent-foreground">
          <span className="min-w-0 truncate">{selectionNote}</span>
          {onClearSelection && (
            <button
              onClick={onClearSelection}
              className="ml-auto shrink-0 rounded-md p-0.5 hover:bg-accent-foreground/10"
              aria-label="Wyczyść zaznaczenie tego wykresu"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      <div className="mt-5 min-h-0 flex-1">
        {showTable && tableRows ? (
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  {tableColumns.map((col) => (
                    <th key={col} className="pb-2 pr-3 font-semibold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {tableRows.map((row) => (
                  <tr key={row.label}>
                    <td className="py-2 pr-3 text-foreground">{row.label}</td>
                    <td className="py-2 pr-3 font-semibold tabular-nums text-foreground">
                      {row.value}
                    </td>
                    {row.extra !== undefined && (
                      <td className="py-2 text-muted-foreground">{row.extra}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[8rem] items-center justify-center text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
