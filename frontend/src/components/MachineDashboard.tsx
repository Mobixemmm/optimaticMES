import { useState, useEffect } from 'react';

interface MachineValue {
  value: number | boolean | string;
  time: string;
}

interface MachineStatus {
  [tagName: string]: MachineValue;
}

export function MachineDashboard() {
  const [machines, setMachines] = useState<string[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [status, setStatus] = useState<MachineStatus | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [allMachinesStatus, setAllMachinesStatus] = useState<Record<string, { running: boolean; alarms: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/machine-data/machines')
      .then(r => r.json())
      .then((data: string[]) => {
        setMachines(data);
        if (data.length > 0) setSelectedMachine(data[0]);

        const statusPromises = data.map(m =>
          fetch(`http://localhost:3001/machine-data/${m}/latest`)
            .then(r => r.json())
            .then((status: MachineStatus) => {
              const running = status['READY']?.value === true || status['RUNNING_F']?.value === true;
              const alarms = Object.entries(status).filter(([tag, val]) =>
                tag.includes('ERROR') || tag.includes('JAM') || tag.includes('STOP') || tag.includes('LOST')
              ).filter(([tag, val]) => val.value === true).length;
              return { machine: m, running, alarms };
            })
        );

        Promise.all(statusPromises).then(results => {
          const map: Record<string, { running: boolean; alarms: number }> = {};
          results.forEach(r => map[r.machine] = { running: r.running, alarms: r.alarms });
          setAllMachinesStatus(map);
          setLoading(false);
        });
      });
  }, []);

  useEffect(() => {
    if (!selectedMachine) return;

    const fetchStatus = () => {
      fetch(`http://localhost:3001/machine-data/${selectedMachine}/latest`)
        .then(r => r.json())
        .then(data => setStatus(data));

      fetch(`http://localhost:3001/machine-data/${selectedMachine}/SPEED?limit=50`)
        .then(r => r.json())
        .then(data => setHistory(data.reverse()));
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [selectedMachine]);

  const getStatusColor = (value: boolean | number | string) => {
    if (typeof value === 'boolean') return value ? 'text-green-600' : 'text-red-600';
    return 'text-blue-600';
  };

  const getStatusBg = (value: boolean | number | string) => {
    if (typeof value === 'boolean') return value ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300';
    return 'bg-blue-50 border-blue-200';
  };

  const getDotColor = (value: boolean | number | string) => {
    if (typeof value === 'boolean') return value ? 'bg-green-500' : 'bg-red-500';
    return 'bg-blue-500';
  };

  const isAlarm = (tagName: string, value: any): boolean => {
    if (typeof value !== 'boolean') return false;
    const alarmTags = ['E_STOP', 'BAG_JAM', 'DIE_BACK', 'GENERAL_ERROR', 'SIGNAL_ERROR', 'SYSTEM_RESET', 'EMPTY'];
    return alarmTags.includes(tagName) && value === true;
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Ładowanie danych z lotniska...</div>;

  const runningMachines = Object.values(allMachinesStatus).filter(s => s.running).length;
  const totalMachines = Object.keys(allMachinesStatus).length;
  const totalAlarms = Object.values(allMachinesStatus).reduce((sum, s) => sum + s.alarms, 0);

  return (
    <div className="space-y-6">
      {/* Statystyki */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-600">
          <div className="text-sm text-gray-500 font-medium">Maszyny w pracy</div>
          <div className="text-3xl font-bold text-green-600 mt-1">{runningMachines} / {totalMachines}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-red-500">
          <div className="text-sm text-gray-500 font-medium">Aktywne alarmy</div>
          <div className="text-3xl font-bold text-red-600 mt-1">{totalAlarms}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
          <div className="text-sm text-gray-500 font-medium">Wybrana maszyna</div>
          <div className="text-xl font-bold text-blue-600 mt-1 truncate">{selectedMachine}</div>
        </div>
        <div className="bg-emerald-700 rounded-xl shadow-sm p-5 text-white">
          <div className="text-sm opacity-80 font-medium">Średnia prędkość</div>
          <div className="text-3xl font-bold mt-1">1 247</div>
          <div className="text-xs opacity-70 mt-1">jednostek / godzinę</div>
        </div>
      </div>

      {/* Mapa maszyn */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">🗺️ Mapa maszyn</h3>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
          {machines.map(machine => {
            const s = allMachinesStatus[machine];
            const isSelected = machine === selectedMachine;
            return (
              <button
                key={machine}
                onClick={() => setSelectedMachine(machine)}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'ring-2 ring-blue-500 bg-blue-100'
                    : s?.running
                      ? 'bg-green-100 hover:bg-green-200 text-green-800'
                      : 'bg-red-100 hover:bg-red-200 text-red-800'
                }`}
                title={`${machine} - ${s?.running ? 'Pracuje' : 'Stop'} ${s?.alarms > 0 ? `(${s.alarms} alarmów)` : ''}`}
              >
                <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${s?.running ? 'bg-green-500' : 'bg-red-500'}`} />
                {machine.replace('conveyor_', 'T').replace('pec_', 'P')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Szczegóły maszyny */}
      {status && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">🏭 {selectedMachine}</h2>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {machines.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Alarmy */}
          {Object.entries(status).filter(([tag, val]) => isAlarm(tag, val)).length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-semibold text-red-700 mb-1">⚠️ ALARMY:</div>
              {Object.entries(status)
                .filter(([tag, val]) => isAlarm(tag, val))
                .map(([tag]) => (
                  <span key={tag} className="inline-block px-2 py-1 bg-red-500 text-white rounded text-xs mr-2">
                    {tag}
                  </span>
                ))}
            </div>
          )}

          {/* Tagi */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(status).map(([tagName, data]) => (
              <div
                key={tagName}
                className={`border rounded-lg p-3 ${getStatusBg(data.value)} ${isAlarm(tagName, data.value) ? 'ring-2 ring-red-500' : ''}`}
              >
                <div className="text-xs text-gray-500 uppercase mb-1">{tagName}</div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getDotColor(data.value)}`} />
                  <span className={`font-bold ${getStatusColor(data.value)}`}>
                    {typeof data.value === 'boolean' ? (data.value ? 'AKTYWNE' : 'WYŁĄCZONE') : String(data.value)}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(data.time).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>

          {/* Wykres prędkości */}
          {history.length > 0 && (
            <div className="mt-6 border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">📈 Prędkość taśmy (SPEED) — ostatnie 50 odczytów</h3>
              <div className="flex items-end gap-1 h-32">
                {history.map((item, i) => {
                  const maxVal = Math.max(...history.map((h: any) => h.value_num || 0), 1);
                  const height = ((item.value_num || 0) / maxVal) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-blue-400 hover:bg-blue-600 transition-colors rounded-t"
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`${item.value_num} o ${new Date(item.time).toLocaleTimeString()}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>50 odczytów temu</span>
                <span>Teraz: {history[history.length - 1]?.value_num || 0}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}