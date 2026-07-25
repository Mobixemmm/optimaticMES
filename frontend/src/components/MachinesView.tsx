import { useState, useEffect } from "react";
import { Factory, ArrowRight } from "lucide-react";

interface MachinesViewProps {
  onSelectMachine: (machineId: string) => void;
}

export function MachinesView({ onSelectMachine }: MachinesViewProps) {
  const [machines, setMachines] = useState<string[]>([]);
  const [allStatus, setAllStatus] = useState<Record<string, { running: boolean; alarms: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3001/machine-data/machines")
      .then((r) => r.json())
      .then((data: string[]) => {
        setMachines(data);
        const promises = data.map((m) =>
          fetch(`http://localhost:3001/machine-data/${m}/latest`)
            .then((r) => r.json())
            .then((st: any) => {
              const running = st["READY"]?.value === true || st["RUNNING_F"]?.value === true;
              const alarms = Object.entries(st).filter(([tag, val]: [string, any]) =>
                tag.includes("ERROR") || tag.includes("JAM") || tag.includes("STOP")
              ).filter(([tag, val]: [string, any]) => val.value === true).length;
              return { machine: m, running, alarms };
            })
        );
        Promise.all(promises).then((results) => {
          const map: Record<string, { running: boolean; alarms: number }> = {};
          results.forEach((r: any) => (map[r.machine] = { running: r.running, alarms: r.alarms }));
          setAllStatus(map);
          setLoading(false);
        });
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-400">Ładowanie maszyn...</div>;

  const running = Object.values(allStatus).filter((s) => s.running).length;
  const total = Object.keys(allStatus).length;
  const alarms = Object.values(allStatus).reduce((sum, s) => sum + s.alarms, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Maszyny lotniskowe</h1>
        <p className="text-sm text-gray-500 mt-1">Kliknij maszynę, aby przejść do panelu operatorskiego.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-emerald-700 p-5 text-white">
          <div className="text-xs font-semibold uppercase opacity-80">W pracy</div>
          <div className="text-3xl font-bold mt-1">{running} / {total}</div>
        </div>
        <div className="rounded-2xl bg-white border border-gray-100 p-5">
          <div className="text-xs font-semibold uppercase text-gray-500">Alarmy</div>
          <div className="text-3xl font-bold text-red-600 mt-1">{alarms}</div>
        </div>
        <div className="rounded-2xl bg-white border border-gray-100 p-5">
          <div className="text-xs font-semibold uppercase text-gray-500">Stanowiska</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{total}</div>
        </div>
      </div>

      {/* Mapa maszyn */}
      <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-4">🗺️ Mapa maszyn — kliknij, aby otworzyć panel</h3>
        <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-3">
          {machines.map((m) => {
            const s = allStatus[m];
            return (
              <button
                key={m}
                onClick={() => onSelectMachine(m)}
                className={`group relative p-3 rounded-xl text-center transition-all hover:scale-105 hover:shadow-md ${
                  s?.running
                    ? "bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-400"
                    : s?.alarms > 0
                    ? "bg-red-50 border-2 border-red-200 hover:border-red-400"
                    : "bg-gray-50 border-2 border-gray-200 hover:border-gray-400"
                }`}
              >
                <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                  s?.running ? "bg-emerald-500" : s?.alarms > 0 ? "bg-red-500 animate-pulse" : "bg-gray-400"
                }`} />
                <div className="text-xs font-bold text-gray-700">
                  {m.replace("conveyor_", "T").replace("pec_", "P")}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  {s?.running ? "Praca" : s?.alarms > 0 ? "Alarm!" : "Stop"}
                </div>
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition">
                  <ArrowRight className="h-3 w-3 text-gray-400" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}