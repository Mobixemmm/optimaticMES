import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Link } from "@tanstack/react-router";
import { Info, SlidersHorizontal } from "lucide-react";
import { Header } from "@/components/shared/Header";
import { MachinePicker } from "@/components/operator-panel/MachinePicker";
import { PanelEmpty } from "@/components/operator-panel/PanelTile";
import { ProductionTile } from "@/components/operator-panel/ProductionTile";
import { ScrapTile } from "@/components/operator-panel/ScrapTile";
import { AndonTile } from "@/components/operator-panel/AndonTile";
import { DowntimeTile } from "@/components/operator-panel/DowntimeTile";
import { TelemetryTile } from "@/components/operator-panel/TelemetryTile";
import { LegendColorProvider } from "@/lib/analytics/legend-color-provider";
import { useMachineConfigsQuery, usePanelModulesQuery } from "@/hooks/use-machine-configs";
import { useBootstrap } from "@/lib/bootstrap";
import type { MachinePanelConfig } from "@/lib/api";

// Klucz w localStorage: panel przy maszynie jest otwierany na stałe na jednym
// ekranie, więc po odświeżeniu ma wrócić do TEJ maszyny, a nie do pierwszej
// z listy. To jedyne ustawienie, które celowo siedzi w przeglądarce, a nie przy
// koncie — jest cechą tego konkretnego ekranu na hali, nie człowieka.
const LAST_MACHINE_KEY = "operatorPanel.lastMachineId";

export function OperatorPanelView() {
  // Kafelek przestoju maluje przyczyny kolorami z preferencji użytkownika —
  // tymi samymi, co analityka. Provider musi więc objąć cały panel.
  return (
    <LegendColorProvider>
      <OperatorPanel />
    </LegendColorProvider>
  );
}

function OperatorPanel() {
  const { data: machines = [], isLoading } = useMachineConfigsQuery();
  const { data: panelModules = [] } = usePanelModulesQuery();
  const { can } = useBootstrap();
  const [selected, setSelected] = useState<string | null>(null);

  // Wybór maszyny ustalamy raz — po wczytaniu listy. Późniejsze przeładowania
  // danych nie mogą przestawić panelu pod ręką operatora.
  useEffect(() => {
    if (selected !== null || machines.length === 0) return;
    const remembered =
      typeof window === "undefined" ? null : window.localStorage.getItem(LAST_MACHINE_KEY);
    const exists = machines.some((m) => m.machineId === remembered);
    setSelected(exists && remembered ? remembered : machines[0].machineId);
  }, [machines, selected]);

  const selectMachine = (machineId: string) => {
    setSelected(machineId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_MACHINE_KEY, machineId);
    }
  };

  const config = useMemo(
    () => machines.find((m) => m.machineId === selected) ?? null,
    [machines, selected],
  );

  const moduleEnabled = useMemo(
    () => new Map(panelModules.map((m) => [m.key, m.moduleEnabled])),
    [panelModules],
  );

  return (
    <>
      <Header
        title="Panel operatorski"
        subtitle="Ekran przy maszynie. Każde stanowisko ma własny zestaw kafelków — wybierz maszynę po lewej."
        action={
          can("panel.configure") ? (
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Konfiguruj panele
            </Link>
          ) : undefined
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[18rem_1fr]">
        <div className="lg:h-[calc(100vh-14rem)]">
          {isLoading ? (
            <div className="rounded-3xl bg-card p-6 text-sm text-muted-foreground shadow-card">
              Wczytywanie kartoteki maszyn…
            </div>
          ) : machines.length === 0 ? (
            <div className="rounded-3xl bg-card p-6 text-sm text-muted-foreground shadow-card">
              Kartoteka maszyn jest pusta. Dodaj maszyny w module Maszyny — panel operatorski
              renderuje się per maszyna, więc bez nich nie ma czego pokazać.
            </div>
          ) : (
            <MachinePicker machines={machines} selected={selected} onSelect={selectMachine} />
          )}
        </div>

        <div className="min-w-0">
          {config === null ? (
            <div className="rounded-3xl bg-card p-6 shadow-card">
              <PanelEmpty message="Wybierz maszynę, aby zobaczyć jej panel." />
            </div>
          ) : (
            <MachinePanel config={config} moduleEnabled={moduleEnabled} />
          )}
        </div>
      </div>
    </>
  );
}

function MachinePanel({
  config,
  moduleEnabled,
}: {
  config: MachinePanelConfig;
  moduleEnabled: Map<string, boolean>;
}) {
  // Kafelek zniknie, gdy klient wyłączy (albo nie kupi) moduł nadrzędny —
  // konfiguracja maszyny mogła zostać zapisana, kiedy moduł jeszcze działał.
  const active = config.panelModules.filter((key) => moduleEnabled.get(key) !== false);
  const hiddenByModule = config.panelModules.length - active.length;

  const tiles: Record<string, ReactElement> = {
    production: <ProductionTile key="production" machineId={config.machineId} />,
    scrap: <ScrapTile key="scrap" config={config} />,
    andon: <AndonTile key="andon" machineId={config.machineId} machineName={config.name} />,
    downtime: <DowntimeTile key="downtime" machineId={config.machineId} />,
    telemetry: <TelemetryTile key="telemetry" machineId={config.machineId} />,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-card px-5 py-4 shadow-card">
        <div className="min-w-0">
          <div className="truncate text-2xl font-bold text-foreground">{config.name}</div>
          <div className="text-xs text-muted-foreground">
            {config.machineId}
            {config.line && ` · ${config.line}`}
            {" · "}
            {config.isCustomized ? "własna konfiguracja panelu" : "ustawienia domyślne"}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-accent-foreground">
          Odrzut:{" "}
          {config.scrapSource === "operator"
            ? "przycisk operatora"
            : config.scrapSource === "telemetry"
              ? `czujnik (${config.scrapTag})`
              : `czujnik + operator`}
        </span>
      </div>

      {active.length === 0 ? (
        <div className="rounded-3xl bg-card p-6 shadow-card">
          <PanelEmpty message="Ta maszyna nie ma włączonego żadnego kafelka. Dobierz je w Ustawieniach → Panele operatorskie." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {active.map((key) => tiles[key]).filter(Boolean)}
        </div>
      )}

      {hiddenByModule > 0 && (
        <div className="flex items-start gap-2 rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {hiddenByModule === 1
              ? "Jeden kafelek jest ukryty"
              : `Ukryte kafelki: ${hiddenByModule}`}{" "}
            — moduł, do którego należą, jest wyłączony u tego klienta. Włącz go w Ustawieniach, żeby
            wrócił na panel.
          </span>
        </div>
      )}
    </div>
  );
}
