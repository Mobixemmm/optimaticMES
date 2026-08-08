export type OeeChartBar = { date: string; pct: number };

export function OeeChart({
  title = "Dostępność maszyn",
  subtitle = "Ostatnie 14 dni · 1 − (przestoje / czas planowany)",
  data,
}: {
  title?: string;
  subtitle?: string;
  data: OeeChartBar[];
}) {
  return (
    <div className="rounded-3xl bg-card p-6 shadow-card h-full">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="mt-8 flex h-64 items-end justify-between gap-2">
        {data.map((b, i) => {
          const isHigh = i === data.length - 1;
          const label = new Date(b.date).toLocaleDateString("pl-PL", {
            weekday: "short",
          });
          return (
            <div key={b.date} className="flex flex-1 flex-col items-center gap-3">
              <div className="relative flex h-full w-full max-w-[64px] items-end">
                {isHigh && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-2 py-1 text-[10px] font-semibold text-background whitespace-nowrap">
                    {b.pct}%
                  </div>
                )}
                <div
                  className={`w-full rounded-t-2xl rounded-b-2xl ${
                    b.pct >= 80
                      ? "bg-gradient-primary"
                      : b.pct >= 60
                        ? "bg-primary-glow/60"
                        : "bg-stripes"
                  }`}
                  style={{ height: `${Math.max(2, b.pct)}%` }}
                />
              </div>
              <div className="text-xs font-medium text-muted-foreground capitalize">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
