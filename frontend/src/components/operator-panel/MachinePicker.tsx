import { useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import type { MachinePanelConfig } from "@/lib/api";

/**
 * Wybór maszyny, na której stoi panel.
 *
 * Napisany pod sto stanowisk, a nie pod pięć: rozwijana lista przy takiej
 * liczbie przestaje działać jako narzędzie wyboru — trzeba szukać po nazwie,
 * a nie przewijać. Grupowanie po linii daje drugi sposób trafienia do maszyny,
 * gdy operator nie pamięta jej oznaczenia.
 */
export function MachinePicker({
  machines,
  selected,
  onSelect,
}: {
  machines: MachinePanelConfig[];
  selected: string | null;
  onSelect: (machineId: string) => void;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? machines.filter(
          (m) =>
            m.name.toLowerCase().includes(needle) ||
            m.machineId.toLowerCase().includes(needle) ||
            (m.line ?? "").toLowerCase().includes(needle),
        )
      : machines;

    const byLine = new Map<string, MachinePanelConfig[]>();
    for (const machine of matched) {
      const key = machine.line ?? "Bez przypisanej linii";
      byLine.set(key, [...(byLine.get(key) ?? []), machine]);
    }
    return [...byLine.entries()].sort(([a], [b]) => a.localeCompare(b, "pl"));
  }, [machines, query]);

  const matchedCount = groups.reduce((sum, [, list]) => sum + list.length, 0);

  return (
    <div className="flex h-full flex-col rounded-3xl bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj maszyny lub linii…"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {matchedCount} z {machines.length} maszyn
      </div>

      <div className="mt-1 min-h-0 flex-1 overflow-y-auto">
        {matchedCount === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Żadna maszyna nie pasuje do „{query}".
          </p>
        ) : (
          groups.map(([line, list]) => (
            <div key={line} className="mb-3">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {line}
              </div>
              <ul className="flex flex-col gap-0.5">
                {list.map((machine) => {
                  const active = machine.machineId === selected;
                  return (
                    <li key={machine.machineId}>
                      <button
                        onClick={() => onSelect(machine.machineId)}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                          active
                            ? "bg-gradient-primary font-semibold text-primary-foreground shadow-elegant"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">{machine.name}</span>
                        {/* Liczba kafelków od razu mówi, czy panel tej maszyny
                            jest w ogóle skonfigurowany — bez wchodzenia w nią. */}
                        <span
                          className={`shrink-0 rounded-full px-1.5 text-[10px] font-bold ${
                            active
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {machine.panelModules.length}
                        </span>
                        {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
