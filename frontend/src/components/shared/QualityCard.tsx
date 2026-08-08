export function QualityCard({
  title = "Jakość produkcji",
  qualityPct,
  produced,
  scrap,
}: {
  title?: string;
  qualityPct: number;
  produced: number;
  scrap: number;
}) {
  const good = Math.max(0, produced - scrap);
  const scrapPct = produced > 0 ? Math.round((scrap / produced) * 1000) / 10 : 0;
  const rings = [
    { l: "Zgodne", v: qualityPct, c: "text-success", d: `${good.toLocaleString("pl-PL")} szt.` },
    { l: "Braki", v: scrapPct, c: "text-destructive", d: `${scrap.toLocaleString("pl-PL")} szt.` },
  ];
  const r = 42,
    C = 2 * Math.PI * r;
  return (
    <div className="h-full rounded-3xl bg-card p-6 shadow-card">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <div className="mt-4 flex items-center justify-center">
        <div className="relative h-40 w-40">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r={r} className="fill-none stroke-muted" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r={r}
              className="fill-none stroke-[color:var(--success)]"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - qualityPct / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold text-foreground">{qualityPct}%</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              FPY
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {rings.map((x) => (
          <div key={x.l} className="flex items-center justify-between text-sm">
            <span className={`inline-flex items-center gap-2 font-medium ${x.c}`}>
              <span className="h-2 w-2 rounded-full bg-current" /> {x.l}
            </span>
            <span className="text-muted-foreground">
              {x.d} · <span className="font-semibold text-foreground">{x.v}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
