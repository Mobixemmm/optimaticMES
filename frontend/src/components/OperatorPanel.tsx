import { useState, useEffect } from "react";
import { ArrowLeft, Factory, AlertTriangle, Play, Pause, Square, User, Clock, CheckCircle } from "lucide-react";

interface Operator {
  id: number;
  firstName: string;
  lastName: string;
}

interface OperatorPanelProps {
  machineId: string;
  onBack: () => void;
  operator: Operator | null;
  onLogin: (op: Operator) => void;
}

export function OperatorPanel({ machineId, onBack, operator, onLogin }: OperatorPanelProps) {
  const [status, setStatus] = useState<Record<string, { value: any; time: string }> | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [rfid, setRfid] = useState("");
  const [rfidError, setRfidError] = useState("");
  const [showScrap, setShowScrap] = useState(false);
  const [scrapQty, setScrapQty] = useState("");
  const [scrapReason, setScrapReason] = useState("defekt");

  // Pobieraj dane co 2s
  useEffect(() => {
    if (!machineId) return;
    const fetchData = () => {
      fetch(`http://localhost:3001/machine-data/${machineId}/latest`)
        .then((r) => r.json())
        .then(setStatus);
      fetch(`http://localhost:3001/machine-data/${machineId}/SPEED?limit=30`)
        .then((r) => r.json())
        .then((data) => setHistory(data.reverse()));
    };
    fetchData();
    const id = setInterval(fetchData, 2000);
    return () => clearInterval(id);
  }, [machineId]);

  // Timer zmiany
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const handleRfid = async () => {
    if (!rfid.trim()) return;
    try {
      const res = await fetch("http://localhost:3001/operators/login-rfid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfidCardId: rfid }),
      });
      if (!res.ok) throw new Error("Błąd");
      const data = await res.json();
      onLogin(data.operator);
      setRfid("");
      setRfidError("");
    } catch {
      setRfidError("Nieznana karta");
    }
  };

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const isRunning = status?.RUNNING_F?.value === true;
  const hasAlarm = status?.BAG_JAM?.value === true || status?.E_STOP?.value === true || status?.GENERAL_ERROR?.value === true;

  const alarmName = hasAlarm
    ? status?.E_STOP?.value
      ? "E_STOP"
      : status?.BAG_JAM?.value
      ? "BAG_JAM"
      : "GENERAL_ERROR"
    : "";

  return (
    <div className="space-y-4">
      {/* Nagłówek z powrotem */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
          <ArrowLeft className="h-4 w-4" /> Powrót do mapy
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel operatora</h1>
          <p className="text-sm text-gray-500">{machineId}</p>
        </div>
      </div>

      {/* Alarm */}
      {hasAlarm && (
        <div className="bg-red-600 text-white p-4 rounded-2xl text-center animate-pulse">
          <AlertTriangle className="h-8 w-8 mx-auto mb-1" />
          <div className="text-xl font-bold">AWARIA: {alarmName}</div>
          <div className="text-sm opacity-80 mt-1">Zgłoś do utrzymania ruchu!</div>
        </div>
      )}

      {/* Status maszyny - DUŻY */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
        <div className={`w-40 h-40 rounded-full mx-auto mb-4 flex items-center justify-center ${
          isRunning ? "bg-emerald-100" : hasAlarm ? "bg-red-100" : "bg-amber-100"
        }`}>
          <Factory className={`h-20 w-20 ${isRunning ? "text-emerald-600" : hasAlarm ? "text-red-600" : "text-amber-600"}`} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">{machineId}</h2>
        <p className={`text-2xl font-bold mt-2 ${isRunning ? "text-emerald-600" : hasAlarm ? "text-red-600" : "text-amber-600"}`}>
          {isRunning ? "🔴 PRACA" : hasAlarm ? "⛔ AWARIA" : "🟡 GOTOWA"}
        </p>
        <div className="text-lg text-gray-500 mt-1">
          SPEED: <span className="font-bold text-gray-900">{status?.SPEED?.value ?? "—"}</span>
        </div>
      </div>

      {/* Parametry */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "SPEED", value: status?.SPEED?.value, unit: "" },
          { label: "RUNNING", value: status?.RUNNING_F?.value === true ? "TAK" : "NIE", unit: "" },
          { label: "AUTO MODE", value: status?.AUTO_MODE?.value === true ? "TAK" : "NIE", unit: "" },
        ].map((p) => (
          <div key={p.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-xs font-bold uppercase text-gray-400">{p.label}</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{p.value ?? "—"} {p.unit}</div>
          </div>
        ))}
      </div>

      {/* Operator + Czas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Operator */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-3">👤 Operator</h3>
          {operator ? (
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
                {operator.firstName[0]}{operator.lastName[0]}
              </div>
              <div>
                <div className="font-bold text-gray-900">{operator.firstName} {operator.lastName}</div>
                <div className="text-xs text-gray-500">Zalogowany</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-500">Zaloguj się przez RFID, aby uruchomić maszynę</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rfid}
                  onChange={(e) => setRfid(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRfid()}
                  placeholder="Numer RFID..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
                />
                <button onClick={handleRfid} className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800">
                  Zaloguj
                </button>
              </div>
              {rfidError && <div className="text-xs text-red-500">{rfidError}</div>}
              <div className="text-[10px] text-gray-400">Test: A3F29B1C4D5E</div>
            </div>
          )}
        </div>

        {/* Czas */}
        <div className="bg-emerald-900 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-emerald-300" />
            <span className="text-xs font-medium text-emerald-300">Czas pracy</span>
          </div>
          <div className="text-4xl font-bold tracking-tight">{fmtTime(seconds)}</div>
          <div className="text-xs text-emerald-300 mt-1">Zmiana: 06:00 – 14:00</div>
        </div>
      </div>

      {/* Przyciski akcji - DUŻE */}
      <div className="grid grid-cols-3 gap-4">
        <button
          disabled={!operator || hasAlarm}
          onClick={() => setRunning(true)}
          className="h-24 rounded-2xl bg-emerald-600 text-white text-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-700 transition active:scale-95"
        >
          <Play className="h-8 w-8 mx-auto mb-1 fill-current" /> START
        </button>
        <button
          onClick={() => setRunning(false)}
          className="h-24 rounded-2xl bg-amber-500 text-white text-xl font-bold hover:bg-amber-600 transition active:scale-95"
        >
          <Pause className="h-8 w-8 mx-auto mb-1 fill-current" /> PAUZA
        </button>
        <button
          onClick={() => { setRunning(false); setSeconds(0); }}
          className="h-24 rounded-2xl bg-gray-600 text-white text-xl font-bold hover:bg-gray-700 transition active:scale-95"
        >
          <Square className="h-8 w-8 mx-auto mb-1 fill-current" /> STOP
        </button>
      </div>

      {/* Awaria + Odrzut */}
      <div className="grid grid-cols-2 gap-4">
        <button className="h-20 rounded-2xl bg-red-600 text-white text-lg font-bold hover:bg-red-700 transition animate-pulse">
          <AlertTriangle className="h-6 w-6 mx-auto mb-1" /> ZGŁOŚ AWARIĘ
        </button>
        <button onClick={() => setShowScrap(true)} className="h-20 rounded-2xl bg-orange-500 text-white text-lg font-bold hover:bg-orange-600 transition">
          🗑️ RAPORTUJ ODRZUT
        </button>
      </div>

      {/* Modal odrzutu */}
      {showScrap && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🗑️ Raportuj odrzut</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Ilość odrzuconych sztuk</label>
                <input type="number" value={scrapQty} onChange={(e) => setScrapQty(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Powód</label>
                <select value={scrapReason} onChange={(e) => setScrapReason(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg">
                  <option value="defekt">Defekt</option>
                  <option value="nadmiar">Nadmiar</option>
                  <option value="uszkodzenie">Uszkodzenie mechaniczne</option>
                  <option value="zanieczyszczenie">Zanieczyszczenie</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowScrap(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Anuluj</button>
              <button onClick={() => { setShowScrap(false); alert("Odrzut zapisany!"); }} className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">Zapisz</button>
            </div>
          </div>
        </div>
      )}

      {/* Wykres SPEED */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-3">📈 Historia prędkości (ostatnie 30 odczytów)</h3>
          <div className="flex items-end gap-1 h-24">
            {history.map((item, i) => {
              const maxVal = Math.max(...history.map((h: any) => h.value_num || 0), 1);
              const height = ((item.value_num || 0) / maxVal) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 bg-blue-400 rounded-t transition-all hover:bg-blue-600"
                  style={{ height: `${Math.max(height, 5)}%` }}
                  title={`${item.value_num}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}