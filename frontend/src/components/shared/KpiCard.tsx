import { ArrowUpRight, ChevronDown, ArrowRight, Filter } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { KpiAction } from "@/lib/analytics/kpi-actions";

export interface KpiDetailRow {
  label: string;
  value: string;
}

interface KpiCardProps {
  label: string;
  value: string;
  delta: string;
  note: string;
  highlight?: boolean;
  warn?: boolean;
  /** Co robi kliknięcie — pochodzi z konfiguracji modułu (panel administratora). */
  action?: KpiAction;
  /** Rozbicie pokazywane pod kafelkiem przy akcji „drilldown". */
  details?: KpiDetailRow[];
  expanded?: boolean;
  onActivate?: () => void;
}

export function KpiCard(props: KpiCardProps) {
  const { action } = props;

  // Kafelek bez akcji zostaje zwykłym blokiem — bez kursora wskazującego
  // i bez roli przycisku, żeby nie obiecywać interakcji, której nie ma.
  if (!action || action.type === "none") {
    return <KpiCardBody {...props} />;
  }

  if (action.type === "navigate" && action.to) {
    return (
      <Link
        to={action.to}
        className="block h-full rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <KpiCardBody {...props} interactive />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={props.onActivate}
      aria-expanded={action.type === "drilldown" ? !!props.expanded : undefined}
      className="block h-full w-full rounded-3xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <KpiCardBody {...props} interactive />
    </button>
  );
}

function KpiCardBody({
  label,
  value,
  delta,
  note,
  highlight,
  warn,
  action,
  details,
  expanded,
  interactive,
}: KpiCardProps & { interactive?: boolean }) {
  // Ikona zapowiada, co się stanie po kliknięciu — strzałka w bok prowadzi na
  // inną stronę, daszek rozwija szczegóły na miejscu, lejek nakłada filtr.
  const ActionIcon =
    action?.type === "navigate"
      ? ArrowRight
      : action?.type === "filter"
        ? Filter
        : action?.type === "drilldown"
          ? ChevronDown
          : ArrowUpRight;

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl p-5 shadow-card transition ${
        highlight ? "bg-gradient-primary text-primary-foreground" : "bg-card text-card-foreground"
      } ${interactive ? "hover:-translate-y-0.5 hover:shadow-elegant" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`text-sm font-medium ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}
        >
          {label}
        </div>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
            highlight
              ? "border-primary-foreground/30 text-primary-foreground"
              : "border-border text-foreground"
          } ${interactive ? "group-hover:border-current" : ""}`}
        >
          <ActionIcon
            className={`h-4 w-4 transition-transform ${
              action?.type === "drilldown" && expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      <div className="mt-6 text-4xl font-bold tracking-tight">{value}</div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            warn
              ? "bg-warning/20 text-warning-foreground"
              : highlight
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-success/15 text-success"
          }`}
        >
          {delta}
        </span>
        <span
          className={`text-xs ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}
        >
          {note}
        </span>
      </div>

      {expanded && details && details.length > 0 && (
        <ul
          className={`mt-4 space-y-1.5 border-t pt-3 ${
            highlight ? "border-primary-foreground/25" : "border-border/60"
          }`}
        >
          {details.map((row) => (
            <li key={row.label} className="flex items-baseline justify-between gap-3 text-xs">
              <span className={highlight ? "text-primary-foreground/80" : "text-muted-foreground"}>
                {row.label}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{row.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
