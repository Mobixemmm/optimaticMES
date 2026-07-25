import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Factory,
  ClipboardList,
  Wrench,
  BarChart3,
  Users,
  Package,
  ArrowLeft,
  Search,
  Bell,
  Plus,
  ArrowUpRight,
  Play,
  Pause,
  Square,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  User,
  Boxes,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type TabKey =
  | "dashboard"
  | "machines"
  | "orders"
  | "maintenance"
  | "analytics"
  | "inventory"
  | "operators"
  | "operator-panel";

const nav: { key: TabKey; icon: typeof LayoutDashboard; label: string; badge?: string }[] = [
  { key: "dashboard", icon: LayoutDashboard, label: "Pulpit" },
  { key: "machines", icon: Factory, label: "Maszyny", badge: "38" },
  { key: "orders", icon: ClipboardList, label: "Zlecenia", badge: "12" },
  { key: "maintenance", icon: Wrench, label: "Utrzymanie ruchu", badge: "3" },
  { key: "analytics", icon: BarChart3, label: "Analityka" },
  { key: "inventory", icon: Package, label: "Magazyn" },
  { key: "operators", icon: Users, label: "Operatorzy" },
];

interface Operator {
  id: number;
  firstName: string;
  lastName: string;
}

/* ─────────────────────── APP ─────────────────────── */
export default function App() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [selectedMachine, setSelectedMachine] = useState<string>("");
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(null);

  const goToMachine = (machineId: string) => {
    setSelectedMachine(machineId);
    setTab("operator-panel");
  };

  const goBack = () => {
    setTab("machines");
    setSelectedMachine("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto flex max-w-[1600px] gap-6">
        <Sidebar tab={tab} setTab={setTab} operator={currentOperator} onLogout={() => setCurrentOperator(null)} />
        <main className="flex-1 space-y-6 min-w-0">
          <TopBar operator={currentOperator} onLogin={setCurrentOperator} />
          {tab === "dashboard" && <DashboardView />}
          {tab === "machines" && <MachinesView onSelectMachine={goToMachine} />}
          {tab === "operator-panel" && (
            <OperatorPanel
              machineId={selectedMachine}
              onBack={goBack}
              operator={currentOperator}
              onLogin={setCurrentOperator}
            />
          )}
          {tab === "orders" && <OrdersView />}
          {tab === "maintenance" && <MaintenanceView />}
          {tab === "analytics" && <AnalyticsView />}
          {tab === "inventory" && <InventoryView />}
          {tab === "operators" && <OperatorsView />}
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────── SIDEBAR ─────────────────────── */
function Sidebar({
  tab,
  setTab,
  operator,
  onLogout,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  operator: Operator | null;
  onLogout: () => void;
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col rounded-3xl bg-white p-5 shadow-card lg:flex border border-gray-100">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 shadow-elegant">
          <Factory className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-lg font-bold tracking-tight text-gray-900">OptimaticMES</div>
          <div className="-mt-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">System produkcji</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {nav.map((item) => {
          const active = tab === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-emerald-50 text-emerald-700 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className={`ml-auto rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  active ? "bg-emerald-200 text-emerald-800" : "bg-gray-100 text-gray-600"
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        {operator ? (
          <div className="rounded-2xl bg-emerald-900 p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 opacity-70" />
              <span className="text-xs opacity-70">Zalogowany</span>
            </div>
            <div className="text-sm font-semibold">{operator.firstName} {operator.lastName}</div>
            <button onClick={onLogout} className="mt-3 w-full rounded-lg bg-white/10 py-2 text-xs font-medium hover:bg-white/20 transition">
              Wyloguj
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-100 p-4">
            <div className="text-sm font-medium text-gray-700 mb-1">Brak operatora</div>
            <div className="text-xs text-gray-500 mb-3">Zaloguj się przez RFID</div>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ─────────────────────── TOP BAR ─────────────────────── */
function TopBar({
  operator,
  onLogin,
}: {
  operator: Operator | null;
  onLogin: (op: Operator) => void;
}) {
  const [rfid, setRfid] = useState("");
  const [rfidError, setRfidError] = useState("");

  const handleRfid = async () => {
    if (!rfid.trim()) return;
    try {
      const res = await fetch("http://localhost:3001/operators/login-rfid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfidCardId: rfid }),
      });
      if (!res.ok) throw new Error("Nieznana karta");
      const data = await res.json();
      onLogin(data.operator);
      setRfid("");
      setRfidError("");
    } catch {
      setRfidError("Nieznana karta RFID");
    }
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Wyszukaj maszynę, zlecenie, operatora..."
          className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
        />
      </div>

      <div className="flex items-center gap-3">
        {!operator && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={rfid}
              onChange={(e) => setRfid(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRfid()}
              placeholder="RFID..."
              className="h-9 w-40 rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleRfid}
              className="h-9 rounded-lg bg-emerald-700 px-3 text-xs font-medium text-white hover:bg-emerald-800 transition"
            >
              Zaloguj
            </button>
          </div>
        )}
        {rfidError && <span className="text-xs text-red-500">{rfidError}</span>}

        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <div className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3">
          <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
            {operator ? operator.firstName[0] + operator.lastName[0] : "?"}
          </div>
          <span className="hidden text-sm font-medium text-gray-700 md:block">
            {operator ? `${operator.firstName} ${operator.lastName}` : "Gość"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── HEADER ─────────────────────── */
function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

/* ─────────────────────── KPI CARD ─────────────────────── */
function KpiCard({
  label,
  value,
  delta,
  note,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  delta: string;
  note: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-card transition hover:shadow-elegant ${
        highlight
          ? "border-emerald-200 bg-emerald-700 text-white"
          : warn
          ? "border-red-200 bg-white"
          : "border-gray-100 bg-white"
      }`}
    >
      {highlight && (
        <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      )}
      <div className="relative">
        <div className={`text-xs font-semibold uppercase tracking-wider ${highlight ? "text-emerald-100" : "text-gray-500"}`}>
          {label}
        </div>
        <div className="mt-2 flex items-end gap-3">
          <div className={`text-3xl font-bold tracking-tight ${highlight ? "text-white" : "text-gray-900"}`}>{value}</div>
          <div className={`mb-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
            warn ? "bg-red-100 text-red-700" : highlight ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
          }`}>
            {warn ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {delta}
          </div>
        </div>
        <div className={`mt-1 text-xs ${highlight ? "text-emerald-100" : "text-gray-400"}`}>{note}</div>
      </div>
    </div>
  );
}

/* ─────────────────────── DASHBOARD VIEW ─────────────────────── */
function DashboardView() {
  return (
    <>
      <Header title="Pulpit produkcji" subtitle="Monitoruj OEE, zlecenia i stan maszyn w czasie rzeczywistym." />
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="OEE ogólne" value="82.4%" delta="+3.1%" note="Wzrost tydzień do tygodnia" highlight />
        <KpiCard label="Wyprodukowane sztuki" value="12 840" delta="+8.6%" note="Wobec planu 12 000" />
        <KpiCard label="Aktywne zlecenia" value="24" delta="+2" note="Rozpoczęte w tej zmianie" />
        <KpiCard label="Awarie" value="3" delta="-1" note="Otwarte zgłoszenia" warn />
      </section>
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3 items-stretch">
        <div className="xl:col-span-2"><OeeChart /></div>
        <ShiftCard />
      </section>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 items-stretch">
        <MachinesCard />
        <QualityCard />
        <AndonCard />
      </section>
      <section className="grid grid-cols-1 gap-4">
        <OrdersCard />
      </section>
    </>
  );
}

/* ─────────────────────── OEE CHART ─────────────────────── */
function OeeChart() {
  const data = [
    { d: "Pon", v: 68 }, { d: "Wt", v: 74 }, { d: "Śr", v: 88 }, { d: "Czw", v: 79 },
    { d: "Pt", v: 82 }, { d: "Sob", v: 55 }, { d: "Nd", v: 42 },
  ];
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card h-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Wydajność OEE (ostatni tydzień)</h3>
        <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">+5.2%</span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} unit="%" />
            <Tooltip
              cursor={{ fill: "#f0fdf4", radius: 8 }}
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
            />
            <Bar dataKey="v" radius={[8, 8, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.v >= 80 ? "#059669" : entry.v >= 60 ? "#0ea5e9" : "#94a3b8"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─────────────────────── SHIFT CARD ─────────────────────── */
function ShiftCard() {
  const [seconds, setSeconds] = useState(5028);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-emerald-900 p-6 text-white shadow-card h-full flex flex-col justify-between relative overflow-hidden">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-4 w-4 text-emerald-300" />
          <span className="text-xs font-medium text-emerald-200">Czas pracy zmiany</span>
        </div>
        <div className="text-4xl font-bold tracking-tight mt-2">{fmt(seconds)}</div>
        <div className="mt-1 text-xs text-emerald-300">Zmiana: 06:00 – 14:00</div>
      </div>
      <div className="relative flex gap-3 mt-6">
        <button
          onClick={() => setRunning(!running)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-900 hover:scale-105 transition"
        >
          {running ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
        </button>
        <button
          onClick={() => { setRunning(false); setSeconds(0); }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white hover:scale-105 transition"
        >
          <Square className="h-4 w-4 fill-current" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────── MACHINES CARD (dashboard mini) ─────────────────────── */
function MachinesCard() {
  const machines = [
    { name: "CNC-01 Mazak", state: "Praca", oee: 91, tone: "run" },
    { name: "CNC-02 DMG", state: "Praca", oee: 84, tone: "run" },
    { name: "Prasa PR-04", state: "Przezbrojenie", oee: 62, tone: "setup" },
    { name: "Robot RB-07", state: "Awaria", oee: 12, tone: "down" },
    { name: "Linia LN-12", state: "Praca", oee: 78, tone: "run" },
  ];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card h-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Stan maszyn</h3>
        <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
          + Dodaj
        </button>
      </div>
      <div className="space-y-3">
        {machines.map((m) => (
          <div key={m.name} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50 transition">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              m.tone === "run" ? "bg-emerald-100 text-emerald-700" :
              m.tone === "setup" ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
            }`}>
              <Factory className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{m.name}</div>
              <div className="text-xs text-gray-500">{m.state}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-gray-900">{m.oee}%</div>
              <div className="text-[10px] text-gray-400">OEE</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── ORDERS CARD ─────────────────────── */
function OrdersCard() {
  const orders = [
    { id: "WO-2418", product: "Obudowa AL-220", qty: "820 / 1000", status: "W toku", tone: "progress" },
    { id: "WO-2417", product: "Wspornik ST-14", qty: "500 / 500", status: "Zakończone", tone: "done" },
    { id: "WO-2416", product: "Panel PC-08", qty: "140 / 600", status: "Wstrzymane", tone: "pause" },
    { id: "WO-2415", product: "Kołnierz FL-32", qty: "320 / 320", status: "Zakończone", tone: "done" },
    { id: "WO-2414", product: "Tuleja TL-09", qty: "60 / 400", status: "W toku", tone: "progress" },
    { id: "WO-2413", product: "Śruba SR-M8", qty: "0 / 2000", status: "Zaplanowane", tone: "plan" },
  ];

  const badge = (tone: string) => {
    switch (tone) {
      case "done": return "bg-emerald-100 text-emerald-700";
      case "progress": return "bg-blue-100 text-blue-700";
      case "pause": return "bg-amber-100 text-amber-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Aktywne zlecenia produkcyjne</h3>
        <button className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-800 transition">
          <Plus className="h-3.5 w-3.5" /> Nowe zlecenie
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="pb-3 pl-2">ID</th>
              <th className="pb-3">Produkt</th>
              <th className="pb-3">Ilość</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 pr-2 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50/50 transition">
                <td className="py-3 pl-2 font-medium text-gray-900">{o.id}</td>
                <td className="py-3 text-gray-600">{o.product}</td>
                <td className="py-3 text-gray-600">{o.qty}</td>
                <td className="py-3">
                  <span className={`rounded-md px-2 py-1 text-[11px] font-bold ${badge(o.tone)}`}>{o.status}</span>
                </td>
                <td className="py-3 pr-2 text-right">
                  <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────── QUALITY CARD ─────────────────────── */
function QualityCard() {
  const data = [
    { name: "OK", value: 94, color: "#059669" },
    { name: "NOK", value: 4, color: "#ef4444" },
    { name: "Ponowna obróbka", value: 2, color: "#f59e0b" },
  ];
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card h-full">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Jakość zmiany</h3>
        <span className="text-xs font-bold text-emerald-700">94% OK</span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex justify-center gap-4">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-gray-600">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── ANDON CARD ─────────────────────── */
function AndonCard() {
  const alerts = [
    { type: "warning", msg: "Wymiana narzędzia T04 na CNC-01", time: "14 min temu" },
    { type: "danger", msg: "Awaria pompy chłodzenia – Prasa PR-04", time: "32 min temu" },
    { type: "info", msg: "Zakończono przezbrojenie – Linia LN-12", time: "1h temu" },
  ];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card h-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Andon – zgłoszenia</h3>
        <span className="rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">3 aktywne</span>
      </div>
      <div className="space-y-3">
        {alerts.map((a, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
              a.type === "danger" ? "bg-red-100 text-red-600" :
              a.type === "warning" ? "bg-amber-100 text-amber-600" :
              "bg-blue-100 text-blue-600"
            }`}>
              {a.type === "danger" ? <AlertTriangle className="h-3.5 w-3.5" /> :
               a.type === "warning" ? <Clock className="h-3.5 w-3.5" /> :
               <CheckCircle2 className="h-3.5 w-3.5" />}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{a.msg}</div>
              <div className="text-xs text-gray-400 mt-0.5">{a.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MACHINES VIEW – styl ProdFlow (karty maszyn)
   ═══════════════════════════════════════════════════════════════ */

interface MachineInfo {
  id: string;
  name: string;
  type: string;
  oee: number;
  status: "Praca" | "Przezbrojenie" | "Awaria" | "Bezczynność";
  operator: string;
  order: string;
}

function MachinesView({ onSelectMachine }: { onSelectMachine: (id: string) => void }) {
  const [machines, setMachines] = useState<MachineInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3001/machine-data/machines")
      .then((r) => r.json())
      .then((data: string[]) => {
        const promises = data.map((m) =>
          fetch(`http://localhost:3001/machine-data/${m}/latest`)
            .then((r) => r.json())
            .then((st: any) => {
              const running = st["READY"]?.value === true || st["RUNNING_F"]?.value === true;
              const alarm = st["BAG_JAM"]?.value === true || st["E_STOP"]?.value === true || st["GENERAL_ERROR"]?.value === true;
              const setup = st["SETUP"]?.value === true;

              let status: MachineInfo["status"] = "Bezczynność";
              if (alarm) status = "Awaria";
              else if (setup) status = "Przezbrojenie";
              else if (running) status = "Praca";

              // Mock OEE na podstawie statusu + losowość z nazwy maszyny
              const seed = m.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
              const baseOee = status === "Awaria" ? 12 : status === "Przezbrojenie" ? 45 : status === "Praca" ? 78 : 0;
              const oee = Math.min(99, Math.max(5, baseOee + (seed % 20) - 10));

              const names: Record<string, string> = {
                "conveyor_12": "CNC-01 Mazak",
                "conveyor_07": "CNC-02 DMG",
                "pec_03": "Prasa PR-04",
                "conveyor_01": "Robot RB-07",
                "conveyor_15": "Linia LN-12",
                "conveyor_22": "Frezarka FR-03",
                "pec_08": "Piec PC-02",
                "conveyor_31": "Pakowarka PK-01",
              };

              const types: Record<string, string> = {
                "conveyor_12": "Obróbka skrawaniem",
                "conveyor_07": "Obróbka skrawaniem",
                "pec_03": "Tłoczenie",
                "conveyor_01": "Spawanie",
                "conveyor_15": "Montaż",
                "conveyor_22": "Obróbka skrawaniem",
                "pec_08": "Obróbka cieplna",
                "conveyor_31": "Pakowanie",
              };

              const operators = ["J. Nowak", "P. Wiśniewski", "M. Zieliński", "K. Lewandowska", "T. Kamiński", "A. Dąbrowska", "—"];
              const orders = ["WO-2418", "WO-2414", "WO-2416", "WO-2415", "WO-2417", "WO-2413", "—"];

              const idx = seed % operators.length;

              return {
                id: m,
                name: names[m] || m,
                type: types[m] || "Produkcja",
                oee,
                status,
                operator: operators[idx],
                order: orders[idx],
              };
            })
        );
        Promise.all(promises).then((results) => {
          setMachines(results);
          setLoading(false);
        });
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-400">Ładowanie maszyn...</div>;

  const working = machines.filter((m) => m.status === "Praca").length;
  const setup = machines.filter((m) => m.status === "Przezbrojenie").length;
  const down = machines.filter((m) => m.status === "Awaria").length;
  const avgOee = machines.length > 0
    ? Math.round(machines.reduce((s, m) => s + m.oee, 0) / machines.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maszyny</h1>
          <p className="text-sm text-gray-500 mt-1">Widok wszystkich zasobów produkcyjnych i ich stanu w czasie rzeczywistym.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 transition shadow-sm">
          <Plus className="h-4 w-4" /> Dodaj maszynę
        </button>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Pracujące"
          value={String(working)}
          delta={`+1`}
          note={`z ${machines.length} maszyn`}
          variant="green"
        />
        <StatTile
          label="Przezbrojenie"
          value={String(setup)}
          delta="+1"
          note="w trakcie"
          variant="white"
        />
        <StatTile
          label="Awarie"
          value={String(down)}
          delta="-2"
          note="do usunięcia"
          variant="white"
        />
        <StatTile
          label="Średnie OEE"
          value={`${avgOee}%`}
          delta="+4%"
          note="ostatnie 24h"
          variant="white"
        />
      </div>

      {/* Siatka kart maszyn */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {machines.map((m) => (
          <MachineCard key={m.id} machine={m} onClick={() => onSelectMachine(m.id)} />
        ))}
      </div>
    </div>
  );
}

/* Kafelek statystyk */
function StatTile({
  label,
  value,
  delta,
  note,
  variant,
}: {
  label: string;
  value: string;
  delta: string;
  note: string;
  variant: "green" | "white";
}) {
  const isGreen = variant === "green";
  return (
    <div
      className={`rounded-2xl p-5 shadow-sm border transition hover:shadow-md cursor-default ${
        isGreen
          ? "bg-emerald-800 text-white border-emerald-800"
          : "bg-white text-gray-900 border-gray-100"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`text-sm font-medium ${isGreen ? "text-emerald-100" : "text-gray-500"}`}>{label}</div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isGreen ? "bg-emerald-700" : "bg-gray-100"}`}>
          <ArrowUpRight className={`h-4 w-4 ${isGreen ? "text-emerald-200" : "text-gray-500"}`} />
        </div>
      </div>
      <div className={`text-4xl font-bold mt-3 ${isGreen ? "text-white" : "text-gray-900"}`}>{value}</div>
      <div className="flex items-center gap-2 mt-2">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
          isGreen ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700"
        }`}>
          {delta}
        </span>
        <span className={`text-xs ${isGreen ? "text-emerald-200" : "text-gray-400"}`}>{note}</span>
      </div>
    </div>
  );
}

/* Karta maszyny */
function MachineCard({ machine, onClick }: { machine: MachineInfo; onClick: () => void }) {
  const statusColors = {
    "Praca": { dot: "bg-emerald-500", bar: "bg-emerald-600", badge: "bg-emerald-50 text-emerald-700" },
    "Przezbrojenie": { dot: "bg-amber-400", bar: "bg-amber-500", badge: "bg-amber-50 text-amber-700" },
    "Awaria": { dot: "bg-red-500", bar: "bg-red-500", badge: "bg-red-50 text-red-700" },
    "Bezczynność": { dot: "bg-gray-400", bar: "bg-gray-400", badge: "bg-gray-100 text-gray-600" },
  };
  const sc = statusColors[machine.status];

  return (
    <button
      onClick={onClick}
      className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition text-left w-full"
    >
      {/* Nagłówek karty */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-bold text-gray-900">{machine.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">{machine.type}</div>
        </div>
        <div className={`h-3 w-3 rounded-full ${sc.dot} ${machine.status === "Awaria" ? "animate-pulse" : ""}`} />
      </div>

      {/* OEE */}
      <div className="flex items-baseline gap-1.5 mt-4">
        <span className={`text-3xl font-bold ${machine.oee >= 70 ? "text-emerald-700" : machine.oee >= 40 ? "text-amber-600" : "text-red-600"}`}>
          {machine.oee}%
        </span>
        <span className="text-xs text-gray-400 font-medium">OEE</span>
      </div>

      {/* Pasek postępu */}
      <div className="mt-3 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${sc.bar} transition-all`}
          style={{ width: `${machine.oee}%` }}
        />
      </div>

      {/* Status + Operator + Zlecenie */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Status</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${sc.badge}`}>
            {machine.status}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Operator</span>
          <span className="text-xs font-medium text-gray-900">{machine.operator}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Zlecenie</span>
          <span className="text-xs font-medium text-gray-900">{machine.order}</span>
        </div>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   OPERATOR PANEL – widok po kliknięciu maszyny
   ═══════════════════════════════════════════════════════════════ */
function OperatorPanel({
  machineId,
  onBack,
  operator,
  onLogin,
}: {
  machineId: string;
  onBack: () => void;
  operator: Operator | null;
  onLogin: (op: Operator) => void;
}) {
  const [status, setStatus] = useState<Record<string, { value: any; time: string }> | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [rfid, setRfid] = useState("");
  const [rfidError, setRfidError] = useState("");
  const [showScrap, setShowScrap] = useState(false);
  const [scrapQty, setScrapQty] = useState("");
  const [scrapReason, setScrapReason] = useState("defekt");

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

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const isRunning = status?.RUNNING_F?.value === true;
  const hasAlarm =
    status?.BAG_JAM?.value === true ||
    status?.E_STOP?.value === true ||
    status?.GENERAL_ERROR?.value === true;

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
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
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

        <div className="bg-emerald-900 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-emerald-300" />
            <span className="text-xs font-medium text-emerald-300">Czas pracy</span>
          </div>
          <div className="text-4xl font-bold tracking-tight">{fmt(seconds)}</div>
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

/* ─────────────────────── ORDERS VIEW ─────────────────────── */
function OrdersView() {
  return (
    <div className="space-y-6">
      <Header title="Zlecenia produkcyjne" subtitle="Zarządzaj zleceniami i śledź postęp produkcji." />
      <OrdersCard />
    </div>
  );
}

/* ─────────────────────── MAINTENANCE VIEW ─────────────────────── */
function MaintenanceView() {
  return (
    <div className="space-y-6">
      <Header title="Utrzymanie ruchu" subtitle="Planuj przeglądy i reaguj na awarie." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Planowane przeglądy" value="5" delta="0" note="W tym tygodniu" />
        <KpiCard label="Naprawy bieżące" value="3" delta="+1" note="Otwarte zgłoszenia" warn />
        <KpiCard label="MTTR średni" value="42 min" delta="-5 min" note="Czas naprawy" />
      </div>
      <AndonCard />
    </div>
  );
}

/* ─────────────────────── ANALYTICS VIEW ─────────────────────── */
function AnalyticsView() {
  return (
    <div className="space-y-6">
      <Header title="Analityka produkcji" subtitle="Analizuj trendy i wydajność." />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <OeeChart />
        <QualityCard />
      </div>
    </div>
  );
}

/* ─────────────────────── INVENTORY VIEW ─────────────────────── */
function InventoryView() {
  return (
    <div className="space-y-6">
      <Header title="Magazyn" subtitle="Stan surowców i gotowych produktów." />
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-card text-center">
        <Boxes className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900">Moduł magazynu</h3>
        <p className="text-sm text-gray-500 mt-1">W trakcie implementacji. Skontaktuj się z administratorem.</p>
      </div>
    </div>
  );
}

/* ─────────────────────── OPERATORS VIEW ─────────────────────── */
function OperatorsView() {
  return (
    <div className="space-y-6">
      <Header title="Operatorzy" subtitle="Zarządzaj operatorami i ich zmianami." />
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-card text-center">
        <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900">Moduł operatorów</h3>
        <p className="text-sm text-gray-500 mt-1">Logowanie RFID dostępne w górnym pasku.</p>
      </div>
    </div>
  );
}