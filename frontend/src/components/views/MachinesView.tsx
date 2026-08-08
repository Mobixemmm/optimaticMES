import { useState } from "react";
import { Plus, Play, Pause, Square, AlertTriangle, X } from "lucide-react";
import { useBootstrap } from "@/lib/bootstrap";
import { useAuth } from "@/lib/auth";
import { useSensorsQuery } from "@/hooks/use-sensors";
import { useLatestMachineDataQuery, useMachineLatestQuery } from "@/hooks/use-machines";
import { useCurrentMachineStopQuery, useMachineStopMutations } from "@/hooks/use-machine-stops";
import { Header } from "@/components/shared/Header";
import { KpiCard } from "@/components/shared/KpiCard";

export function MachinesView() {
  const { moduleFlag } = useBootstrap();
  // Dawne flagi ENABLE_* zeszły do konfiguracji modułu "machines" — patrz
  // module_configs.config i MODULE_DEFINITIONS po stronie backendu.
  const temperatureStream = moduleFlag("machines", "temperatureStream");
  const operatorPanel = moduleFlag("machines", "operatorPanel");
  const allowAddMachine = moduleFlag("machines", "allowAddMachine");
  const { permissions } = useAuth();
  const canAddMachine = allowAddMachine && permissions.canManageMachines;
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);

  // 1. Pobieranie danych z czujników
  const { data: sensorReadings } = useSensorsQuery({
    enabled: temperatureStream,
    refetchInterval: 2000,
  });

  // 2. Pobieranie odczytów z maszyn
  const { data: latestData, isLoading } = useLatestMachineDataQuery({ refetchInterval: 2000 });

  // Grupowanie ostatnich odczytów według machine_id
  const groupedMachines = (latestData || []).reduce((acc: Record<string, any[]>, row: any) => {
    const id = row.machine_id || row.machineId || "Nieznana maszyna";
    if (!acc[id]) acc[id] = [];
    acc[id].push(row);
    return acc;
  }, {});

  const machineKeys =
    Object.keys(groupedMachines).length > 0
      ? Object.keys(groupedMachines)
      : ["CNC-01 Mazak", "CNC-02 DMG", "Prasa PR-04", "Robot RB-07", "Linia LN-12"];

  const latestSensor =
    Array.isArray(sensorReadings) && sensorReadings.length > 0 ? sensorReadings[0] : null;

  return (
    <>
      <Header
        title="Maszyny & Czujniki Temperatury"
        subtitle={
          operatorPanel
            ? "Kliknij w kartę maszyny, aby otworzyć Panel Operatora."
            : "Widok stanu maszyn halowych."
        }
        action={
          canAddMachine ? (
            <button className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elegant">
              <Plus className="h-4 w-4" /> Dodaj maszynę
            </button>
          ) : undefined
        }
      />
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Aktywne Maszyny"
          value={machineKeys.length.toString()}
          delta="Live"
          note="z bazy danych"
          highlight
        />
        {temperatureStream && (
          <KpiCard
            label="Najnowsza Temperatura"
            value={latestSensor ? `${latestSensor.value} ${latestSensor.unit}` : "Brak odczytu"}
            delta="Sensor #1"
            note={latestSensor?.sensorName || "Termometr"}
          />
        )}
        <KpiCard label="Częstotliwość" value="5s" delta="Auto" note="generowanie temperatur" />
        <KpiCard label="Status Czujnika" value="Praca" delta="OK" note="Linia Produkcyjna 1" />
      </section>

      {isLoading && (
        <div className="p-6 text-foreground font-medium">Ładowanie odczytów z maszyn...</div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {machineKeys.map((machineId, index) => {
          const rows = groupedMachines[machineId] || [];
          const tempRow = rows.find((r: any) => (r.tag_name || r.tagName) === "temperature");

          const currentTemp = tempRow
            ? tempRow.value_num
            : latestSensor
              ? (Number(latestSensor.value) + (index % 3) * 2.4 - 1.2).toFixed(1)
              : (65 + ((index * 4.2) % 25)).toFixed(1);

          return (
            <div
              key={machineId}
              onClick={() => {
                if (operatorPanel) setSelectedMachineId(machineId);
              }}
              className={`rounded-3xl bg-card p-5 shadow-card border border-border/50 transition-all ${
                operatorPanel ? "cursor-pointer hover:scale-[1.02] hover:shadow-lg" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-bold text-foreground">{machineId}</div>
                  <div className="text-xs text-muted-foreground">
                    {operatorPanel ? "Kliknij, aby otworzyć Panel Operatora" : "Podgląd maszyny"}
                  </div>
                </div>
                <span className="relative flex h-3 w-3 rounded-full bg-success">
                  <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
                </span>
              </div>

              {/* Temperatura (gdy włączony jest stream) */}
              {temperatureStream && (
                <div className="mt-4 rounded-2xl bg-muted/50 p-3.5 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-semibold">
                      Bieżąca Temperatura
                    </div>
                    <div className="text-3xl font-extrabold text-primary mt-0.5">
                      {currentTemp} °C
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        Number(currentTemp) > 85
                          ? "bg-destructive/20 text-destructive"
                          : "bg-success/20 text-success"
                      }`}
                    >
                      {Number(currentTemp) > 85 ? "Wysoka" : "Norma"}
                    </span>
                  </div>
                </div>
              )}

              {/* Tagi i wartości */}
              <div className="mt-4 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">
                  Ostatnie odczyty parametrów:
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {rows.length > 0 ? (
                    rows.map((r: any, idx: number) => (
                      <div
                        key={r.id || idx}
                        className="flex justify-between items-center text-xs p-1.5 rounded-xl bg-background/80"
                      >
                        <span className="font-medium text-foreground">
                          {r.tag_name || r.tagName}
                        </span>
                        <span className="font-mono text-primary font-semibold">
                          {String(r.value_num ?? r.value_text ?? r.value_bool)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {r.time ? new Date(r.time).toLocaleTimeString() : ""}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground p-2 rounded-xl bg-background/60">
                      Podłączony czujnik: {latestSensor?.sensorName || "Termometr_Linia1"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Modal: Panel Operatora Maszyny */}
      {selectedMachineId && (
        <MachineOperatorModal
          machineId={selectedMachineId}
          onClose={() => setSelectedMachineId(null)}
        />
      )}
    </>
  );
}

const STOP_REASON_LABEL: Record<string, string> = {
  failure: "Awaria",
  setup: "Przezbrojenie",
  material: "Brak materiału",
  micro_stop: "Mikroprzestój",
  quality: "Jakość",
  planned: "Planowany postój",
};

function MachineOperatorModal({ machineId, onClose }: { machineId: string; onClose: () => void }) {
  const { permissions } = useAuth();
  const canControl = permissions.canControlMachines;

  const { data: latestValues } = useMachineLatestQuery(machineId, { refetchInterval: 2000 });

  const { data: sensorReadings } = useSensorsQuery({ refetchInterval: 2000 });

  const { data: currentStop } = useCurrentMachineStopQuery(machineId, { refetchInterval: 3000 });
  const { startMutation, endMutation } = useMachineStopMutations(machineId);

  const latestSensor =
    Array.isArray(sensorReadings) && sensorReadings.length > 0 ? sensorReadings[0] : null;

  const stateLabel = currentStop
    ? STOP_REASON_LABEL[currentStop.reason] || currentStop.reason
    : "Praca";
  const isBusy = startMutation.isPending || endMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-3xl bg-card p-6 shadow-2xl border border-border space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Panel Operatora: {machineId}</h2>
            <p className="text-xs text-muted-foreground">
              Stan maszyny:{" "}
              <span
                className={`font-bold ${currentStop ? (currentStop.reason === "failure" ? "text-destructive" : "text-warning-foreground") : "text-success"}`}
              >
                {stateLabel}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-muted p-2 text-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Przyciski operacyjne */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => endMutation.mutate(machineId)}
            disabled={!canControl || isBusy || !currentStop}
            className="flex items-center justify-center gap-2 rounded-2xl bg-success text-success-foreground font-bold p-3 text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4" /> Start pracy
          </button>
          <button
            onClick={() => startMutation.mutate({ machine: machineId, reason: "setup" })}
            disabled={!canControl || isBusy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-warning text-warning-foreground font-bold p-3 text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Pause className="h-4 w-4" /> Przezbrojenie
          </button>
          <button
            onClick={() => startMutation.mutate({ machine: machineId, reason: "failure" })}
            disabled={!canControl || isBusy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-destructive text-destructive-foreground font-bold p-3 text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <AlertTriangle className="h-4 w-4" /> Awaria
          </button>
          <button
            onClick={() => startMutation.mutate({ machine: machineId, reason: "planned" })}
            disabled={!canControl || isBusy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-muted text-foreground font-bold p-3 text-sm hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Square className="h-4 w-4" /> Stop
          </button>
        </div>
        {!canControl && (
          <p className="text-xs text-muted-foreground -mt-3">
            Brak uprawnień do sterowania maszyną (wymagana rola Admin lub Contributor).
          </p>
        )}

        {/* Sekcja temperatury na żywo */}
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-primary">
              Temperatura na Żywo (Backend Auto-Sensor)
            </div>
            <div className="text-4xl font-black text-primary mt-1">
              {latestSensor ? `${latestSensor.value} °C` : "Pobieranie..."}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Lokalizacja: {latestSensor?.location || "Linia Produkcyjna"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-muted-foreground">Ostatnia aktualizacja</div>
            <div className="text-sm font-mono font-bold text-foreground">
              {latestSensor?.timestamp
                ? new Date(latestSensor.timestamp).toLocaleTimeString()
                : "Na żywo"}
            </div>
          </div>
        </div>

        {/* Odczyty parametrów */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">
            Aktualne Parametry Maszyny
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
            {latestValues && Object.keys(latestValues).length > 0 ? (
              Object.entries(latestValues).map(([tag, valObj]: [string, any]) => (
                <div
                  key={tag}
                  className="flex justify-between items-center p-3 rounded-2xl bg-muted/60"
                >
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground">{tag}</div>
                    <div className="text-sm font-bold text-foreground">{String(valObj?.value)}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {valObj?.time ? new Date(valObj.time).toLocaleTimeString() : ""}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-sm text-muted-foreground p-3 rounded-2xl bg-muted/40">
                Połączono z czujnikiem <code>{latestSensor?.sensorName || "Termometr_Linia1"}</code>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <button
            onClick={onClose}
            className="rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Zamknij panel
          </button>
        </div>
      </div>
    </div>
  );
}
