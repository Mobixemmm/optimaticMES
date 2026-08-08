import { useMemo, useState } from "react";
import { Copy, Search, Check, AlertTriangle, MonitorCog } from "lucide-react";
import { resolveIcon } from "@/lib/icons";
import { SectionHeading } from "./SectionHeading";
import {
  useMachineConfigMutations,
  useMachineConfigsQuery,
  usePanelModulesQuery,
} from "@/hooks/use-machine-configs";
import { useScrapCategoriesQuery } from "@/hooks/use-scrap";
import type { MachinePanelConfig, ScrapSource } from "@/lib/api";

const SCRAP_SOURCE_OPTIONS: { value: ScrapSource; label: string; help: string }[] = [
  {
    value: "operator",
    label: "Przycisk operatora",
    help: "Operator zgłasza odrzut z panelu i od razu podaje przyczynę. Stanowisko bez czujnika.",
  },
  {
    value: "telemetry",
    label: "Czujnik (logi maszyny)",
    help: "Odrzut liczy narastający licznik z telemetrii. Przycisk na panelu jest wyłączony, żeby nie podwajać braków.",
  },
  {
    value: "both",
    label: "Czujnik + operator",
    help: "Licznik podaje sztuki, operator dokłada przyczyny i braki spoza automatu.",
  },
];

/**
 * Konfiguracja paneli HMI per maszyna.
 *
 * Sedno problemu: sto maszyn to sto paneli, a każdy może mieć inny zestaw
 * kafelków i inne źródło odrzutu. Dlatego oprócz edycji pojedynczej maszyny
 * jest kopiowanie ustawień na zaznaczone albo na wszystkie — bez tego
 * wdrożenie zatrzymuje się na klikaniu setki formularzy.
 */
export function MachinePanelsSection() {
  const { data: machines = [] } = useMachineConfigsQuery();
  const { data: panelModules = [] } = usePanelModulesQuery();
  const { data: categories = [] } = useScrapCategoriesQuery();
  const { updateMutation, bulkMutation } = useMachineConfigMutations();

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bulkDone, setBulkDone] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return machines;
    return machines.filter(
      (m) =>
        m.name.toLowerCase().includes(needle) ||
        m.machineId.toLowerCase().includes(needle) ||
        (m.line ?? "").toLowerCase().includes(needle),
    );
  }, [machines, query]);

  const selected =
    machines.find((m) => m.machineId === selectedId) ?? filtered[0] ?? machines[0] ?? null;

  const patch = (data: Parameters<typeof updateMutation.mutate>[0]) => updateMutation.mutate(data);

  const applyToAll = () => {
    if (!selected) return;
    if (
      !confirm(
        `Skopiować ustawienia panelu z „${selected.name}" na WSZYSTKIE ${machines.length} maszyn? ` +
          "Nadpisze to ich obecne kafelki i źródło odrzutu.",
      )
    ) {
      return;
    }
    bulkMutation.mutate(
      {
        allMachines: true,
        panelModules: selected.panelModules,
        scrapSource: selected.scrapSource,
        scrapTag: selected.scrapTag,
        scrapDefaultCategory: selected.scrapDefaultCategory,
      },
      {
        onSuccess: (result) => {
          setBulkDone(`Zastosowano na ${result.updated} maszynach`);
          setTimeout(() => setBulkDone(null), 5000);
        },
      },
    );
  };

  return (
    <div className="rounded-3xl bg-card p-6 shadow-card border border-border/50">
      <SectionHeading
        icon={MonitorCog}
        title="Panele operatorskie"
        description="Każda maszyna ma własny panel HMI. Tu decydujesz, jakie kafelki na nim stoją i skąd bierze się odrzut — z czujnika, z przycisku operatora, albo z obu źródeł naraz."
      />

      {machines.length === 0 ? (
        <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
          Kartoteka maszyn jest pusta. Dodaj maszyny w module Maszyny — panel konfiguruje się per
          maszyna, więc bez nich nie ma czego ustawiać.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Szukaj maszyny…"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <ul className="mt-2 max-h-96 overflow-y-auto">
              {filtered.map((machine) => {
                const active = selected?.machineId === machine.machineId;
                return (
                  <li key={machine.machineId}>
                    <button
                      onClick={() => setSelectedId(machine.machineId)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                        active
                          ? "bg-gradient-primary font-semibold text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{machine.name}</span>
                      {/* Kropka odróżnia maszynę ustawioną ręcznie od jadącej
                          na domyślnych — przy stu pozycjach to jedyny sposób,
                          żeby zobaczyć, co już zrobiono. */}
                      {machine.isCustomized && (
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            active ? "bg-primary-foreground" : "bg-primary"
                          }`}
                          title="Własna konfiguracja"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selected && (
            <MachineEditor
              machine={selected}
              panelModules={panelModules}
              categories={categories}
              onPatch={patch}
              onApplyToAll={applyToAll}
              isBusy={updateMutation.isPending || bulkMutation.isPending}
              bulkDone={bulkDone}
              error={
                (updateMutation.error as Error | null)?.message ??
                (bulkMutation.error as Error | null)?.message ??
                null
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

function MachineEditor({
  machine,
  panelModules,
  categories,
  onPatch,
  onApplyToAll,
  isBusy,
  bulkDone,
  error,
}: {
  machine: MachinePanelConfig;
  panelModules: ReturnType<typeof usePanelModulesQuery>["data"];
  categories: ReturnType<typeof useScrapCategoriesQuery>["data"];
  onPatch: (data: {
    machineId: string;
    panelModules?: string[];
    scrapSource?: ScrapSource;
    scrapTag?: string;
    scrapDefaultCategory?: string;
  }) => void;
  onApplyToAll: () => void;
  isBusy: boolean;
  bulkDone: string | null;
  error: string | null;
}) {
  const toggleTile = (key: string) => {
    const next = machine.panelModules.includes(key)
      ? machine.panelModules.filter((k) => k !== key)
      : [...machine.panelModules, key];
    onPatch({ machineId: machine.machineId, panelModules: next });
  };

  const usesTelemetry = machine.scrapSource !== "operator";

  return (
    <div className="min-w-0 rounded-2xl bg-muted/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-lg font-bold text-foreground">{machine.name}</div>
          <div className="font-mono text-[10px] text-muted-foreground">
            {machine.machineId}
            {machine.line && ` · ${machine.line}`}
            {" · "}
            {machine.isCustomized ? "własna konfiguracja" : "ustawienia domyślne"}
          </div>
        </div>
        <button
          onClick={onApplyToAll}
          disabled={isBusy}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-card px-3 py-2 text-xs font-bold text-foreground border border-border transition hover:bg-accent disabled:opacity-50"
        >
          <Copy className="h-3.5 w-3.5" />
          Zastosuj na wszystkich maszynach
        </button>
      </div>

      {bulkDone && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-success/20 px-3 py-2 text-xs font-bold text-success-foreground">
          <Check className="h-3.5 w-3.5 shrink-0" />
          {bulkDone}
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-xl bg-destructive/15 px-3 py-2 text-xs font-semibold text-destructive">
          {error}
        </div>
      )}

      <h4 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Kafelki na panelu
      </h4>
      <ul className="grid gap-2 sm:grid-cols-2">
        {(panelModules ?? []).map((panel) => {
          const on = machine.panelModules.includes(panel.key);
          const Icon = resolveIcon(panel.icon);
          return (
            <li key={panel.key}>
              <button
                onClick={() => panel.moduleEnabled && toggleTile(panel.key)}
                disabled={!panel.moduleEnabled || isBusy}
                title={
                  panel.moduleEnabled
                    ? panel.description
                    : `Wymaga włączonego modułu „${panel.moduleLabel}"`
                }
                className={`flex w-full items-start gap-2.5 rounded-2xl border p-3 text-left transition ${
                  !panel.moduleEnabled
                    ? "cursor-not-allowed border-border bg-muted/30 opacity-50"
                    : on
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-accent/40"
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-foreground">{panel.label}</span>
                  <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                    {panel.moduleEnabled
                      ? panel.description
                      : `Moduł „${panel.moduleLabel}" jest wyłączony`}
                  </span>
                </span>
                {on && panel.moduleEnabled && (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <h4 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Źródło odrzutu
      </h4>
      <div className="grid gap-2 sm:grid-cols-3">
        {SCRAP_SOURCE_OPTIONS.map((option) => {
          const on = machine.scrapSource === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onPatch({ machineId: machine.machineId, scrapSource: option.value })}
              disabled={isBusy}
              className={`rounded-2xl border p-3 text-left transition ${
                on ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent/40"
              }`}
            >
              <span className="block text-xs font-bold text-foreground">{option.label}</span>
              <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                {option.help}
              </span>
            </button>
          );
        })}
      </div>

      {usesTelemetry && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tag licznika odrzutu
            </span>
            <input
              defaultValue={machine.scrapTag}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && value !== machine.scrapTag) {
                  onPatch({ machineId: machine.machineId, scrapTag: value });
                }
              }}
              className="rounded-xl bg-card px-3 py-2 font-mono text-xs text-foreground border border-border outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Kategoria dla odrzutu z czujnika
            </span>
            <select
              value={machine.scrapDefaultCategory}
              onChange={(e) =>
                onPatch({ machineId: machine.machineId, scrapDefaultCategory: e.target.value })
              }
              className="rounded-xl bg-card px-3 py-2 text-xs text-foreground border border-border outline-none focus:border-primary"
            >
              {(categories ?? []).map((category) => (
                <option key={category.code} value={category.code}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <p className="flex items-start gap-2 text-[11px] leading-snug text-muted-foreground sm:col-span-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Licznik musi być <strong>narastający</strong> — system liczy przyrosty między próbkami.
            Pierwszy odczyt po włączeniu ustawia punkt odniesienia, więc stan sprzed wdrożenia nie
            wjedzie jako jednorazowy gigantyczny odrzut.
          </p>
        </div>
      )}
    </div>
  );
}
