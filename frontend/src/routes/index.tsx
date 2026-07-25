import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Factory,
  ClipboardList,
  Wrench,
  BarChart3,
  Users,
  Settings,
  LifeBuoy,
  LogOut,
  Search,
  Bell,
  Mail,
  Plus,
  ArrowUpRight,
  Play,
  Pause,
  Square,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Package,
  Gauge,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  Boxes,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: MesDashboard,
});

type TabKey =
  | "dashboard"
  | "machines"
  | "orders"
  | "maintenance"
  | "analytics"
  | "inventory"
  | "operators";

const nav: { key: TabKey; icon: typeof LayoutDashboard; label: string; badge?: string }[] = [
  { key: "dashboard", icon: LayoutDashboard, label: "Pulpit" },
  { key: "machines", icon: Factory, label: "Maszyny", badge: "18" },
  { key: "orders", icon: ClipboardList, label: "Zlecenia", badge: "24" },
  { key: "maintenance", icon: Wrench, label: "Utrzymanie ruchu", badge: "5" },
  { key: "analytics", icon: BarChart3, label: "Analityka" },
  { key: "inventory", icon: Package, label: "Magazyn" },
  { key: "operators", icon: Users, label: "Operatorzy" },
];

const kpis = [
  { label: "OEE ogólne", value: "82.4%", delta: "+3.1%", note: "Wzrost tydzień do tygodnia", primary: true },
  { label: "Wyprodukowane sztuki", value: "12 840", delta: "+8.6%", note: "Wobec planu 12 000" },
  { label: "Aktywne zlecenia", value: "24", delta: "+2", note: "Rozpoczęte w tej zmianie" },
  { label: "Awarie", value: "3", delta: "-1", note: "Otwarte zgłoszenia", warn: true },
];

const oeeBars = [
  { d: "Pon", v: 68 }, { d: "Wt", v: 74 }, { d: "Śr", v: 88, hi: true },
  { d: "Czw", v: 79 }, { d: "Pt", v: 82 }, { d: "Sob", v: 55 }, { d: "Nd", v: 42 },
];

const orders = [
  { id: "WO-2418", product: "Obudowa AL-220", qty: "820 / 1000", status: "W toku", tone: "progress" },
  { id: "WO-2417", product: "Wspornik ST-14", qty: "500 / 500", status: "Zakończone", tone: "done" },
  { id: "WO-2416", product: "Panel PC-08", qty: "140 / 600", status: "Wstrzymane", tone: "pause" },
  { id: "WO-2415", product: "Kołnierz FL-32", qty: "320 / 320", status: "Zakończone", tone: "done" },
  { id: "WO-2414", product: "Tuleja TL-09", qty: "60 / 400", status: "W toku", tone: "progress" },
  { id: "WO-2413", product: "Śruba SR-M8", qty: "0 / 2000", status: "Zaplanowane", tone: "plan" },
];

const machines = [
  { name: "CNC-01 Mazak", state: "Praca", oee: 91, tone: "run" },
  { name: "CNC-02 DMG", state: "Praca", oee: 84, tone: "run" },
  { name: "Prasa PR-04", state: "Przezbrojenie", oee: 62, tone: "setup" },
  { name: "Robot RB-07", state: "Awaria", oee: 12, tone: "down" },
  { name: "Linia LN-12", state: "Praca", oee: 78, tone: "run" },
];

function MesDashboard() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto flex max-w-[1600px] gap-6">
        <Sidebar tab={tab} setTab={setTab} />
        <main className="flex-1 space-y-6 min-w-0">
          <TopBar />
          {tab === "dashboard" && <DashboardView />}
          {tab === "machines" && <MachinesView />}
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

function DashboardView() {
  return (
    <>
      <Header
        title="Pulpit produkcji"
        subtitle="Monitoruj OEE, zlecenia i stan maszyn w czasie rzeczywistym."
      />
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => <KpiCard key={k.label} {...k} highlight={i === 0} />)}
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

function Sidebar({ tab, setTab }: { tab: TabKey; setTab: (t: TabKey) => void }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col rounded-3xl bg-sidebar p-5 shadow-card lg:flex">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-elegant">
          <Factory className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <div className="text-lg font-bold tracking-tight text-foreground">ProdFlow</div>
          <div className="-mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">MES Suite</div>
        </div>
      </div>

      <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Menu</div>
      <nav className="flex flex-col gap-1">
        {nav.map(({ key, icon: Icon, label, badge }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
              {badge && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-accent text-accent-foreground"
                }`}>{badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-8 mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ogólne</div>
      <nav className="flex flex-col gap-1">
        {[{ i: Settings, l: "Ustawienia" }, { i: LifeBuoy, l: "Pomoc" }, { i: LogOut, l: "Wyloguj" }].map(({ i: Icon, l }) => (
          <button key={l} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent">
            <Icon className="h-4 w-4" />
            <span>{l}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6">
        <SidebarShiftTile />
      </div>
    </aside>
  );
}

function SidebarShiftTile() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-dark p-4 text-primary-foreground shadow-elegant">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/15">
          <Clock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[10px] font-medium uppercase tracking-wider opacity-70">Zmiana bieżąca</div>
          <div className="truncate text-sm font-bold">Zmiana II · 14–22</div>
        </div>
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-success/70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] opacity-80">
        <User className="h-3 w-3" /> Mistrz: A. Kowalski
      </div>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] opacity-80">
          <span>Postęp zmiany</span><span className="font-semibold">64%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-primary-foreground/15">
          <div className="h-full w-[64%] rounded-full bg-success" />
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-card p-3 shadow-card">
      <div className="flex flex-1 items-center gap-3 rounded-2xl bg-muted px-4 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Szukaj zlecenia, maszyny, operatora…"
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <kbd className="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">⌘ K</kbd>
      </div>
      <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted transition hover:bg-accent">
        <Mail className="h-4 w-4 text-foreground" />
      </button>
      <button className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-muted transition hover:bg-accent">
        <Bell className="h-4 w-4 text-foreground" />
        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive" />
      </button>
      <div className="flex items-center gap-3 rounded-2xl bg-muted px-2 py-1.5 pr-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-sm font-bold text-primary-foreground">AK</div>
        <div className="hidden sm:block">
          <div className="text-sm font-semibold text-foreground">Anna Kowalska</div>
          <div className="text-[11px] text-muted-foreground">Kierownik produkcji</div>
        </div>
      </div>
    </div>
  );
}

function Header({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex gap-2">
        {action ?? (
          <>
            <button className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-95">
              <Plus className="h-4 w-4" /> Nowe zlecenie
            </button>
            <button className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted">
              Eksport raportu
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, delta, note, highlight, warn }: {
  label: string; value: string; delta: string; note: string; highlight?: boolean; warn?: boolean;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-3xl p-5 shadow-card transition ${
      highlight ? "bg-gradient-primary text-primary-foreground" : "bg-card text-card-foreground"
    }`}>
      <div className="flex items-start justify-between">
        <div className={`text-sm font-medium ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{label}</div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${
          highlight ? "border-primary-foreground/30 text-primary-foreground" : "border-border text-foreground"
        }`}>
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-6 text-4xl font-bold tracking-tight">{value}</div>
      <div className="mt-3 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          warn
            ? "bg-warning/20 text-warning-foreground"
            : highlight
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-success/15 text-success"
        }`}>
          {delta}
        </span>
        <span className={`text-xs ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{note}</span>
      </div>
    </div>
  );
}

function OeeChart() {
  return (
    <div className="rounded-3xl bg-card p-6 shadow-card h-full">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">OEE tygodniowe</h3>
          <p className="text-xs text-muted-foreground">Dostępność × Wydajność × Jakość</p>
        </div>
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {["7d", "30d", "Kwartał"].map((t, i) => (
            <button key={t} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              i === 0 ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>{t}</button>
          ))}
        </div>
      </div>
      <div className="mt-8 flex h-64 items-end justify-between gap-3">
        {oeeBars.map((b) => (
          <div key={b.d} className="flex flex-1 flex-col items-center gap-3">
            <div className="relative flex h-full w-full max-w-[64px] items-end">
              {b.hi && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-2 py-1 text-[10px] font-semibold text-background">
                  {b.v}%
                </div>
              )}
              <div
                className={`w-full rounded-t-2xl rounded-b-2xl ${
                  b.v >= 80 ? "bg-gradient-primary" : b.v >= 60 ? "bg-primary-glow/60" : "bg-stripes"
                }`}
                style={{ height: `${b.v}%` }}
              />
            </div>
            <div className="text-xs font-medium text-muted-foreground">{b.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShiftCard() {
  return (
    <div className="flex h-full flex-col rounded-3xl bg-card p-6 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Postęp zmiany</h3>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="my-4 flex items-baseline gap-2">
        <div className="text-5xl font-bold text-primary">64%</div>
        <div className="text-sm text-muted-foreground">planu</div>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-[64%] rounded-full bg-gradient-primary" />
      </div>
      <div className="mt-4 space-y-3 text-sm">
        {[
          { l: "Plan", v: "12 000 szt.", i: Gauge },
          { l: "Wykonano", v: "7 680 szt.", i: CheckCircle2 },
          { l: "Do końca zmiany", v: "3h 12min", i: Activity },
        ].map(({ l, v, i: Icon }) => (
          <div key={l} className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4" /> {l}
            </span>
            <span className="font-semibold text-foreground">{v}</span>
          </div>
        ))}
      </div>
      <button className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-dark px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elegant">
        <Play className="h-4 w-4 fill-current" /> Otwórz Andon
      </button>
    </div>
  );
}

function MachinesCard() {
  const dot = (t: string) =>
    t === "run" ? "bg-success" : t === "setup" ? "bg-warning" : "bg-destructive";
  return (
    <div className="h-full rounded-3xl bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Stan maszyn</h3>
        <button className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted">
          <Plus className="h-3 w-3" /> Dodaj
        </button>
      </div>
      <ul className="space-y-3">
        {machines.map((m) => (
          <li key={m.name} className="flex items-center gap-3">
            <span className={`relative flex h-2.5 w-2.5 shrink-0 rounded-full ${dot(m.tone)}`}>
              {m.tone === "run" && <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />}
            </span>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">{m.name}</div>
              <div className="text-xs text-muted-foreground">{m.state}</div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-bold ${m.oee < 40 ? "text-destructive" : m.oee < 70 ? "text-warning-foreground" : "text-primary"}`}>{m.oee}%</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">OEE</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrdersCard() {
  const badge = (t: string) =>
    t === "done" ? "bg-success/15 text-success" :
    t === "progress" ? "bg-primary/10 text-primary" :
    t === "plan" ? "bg-muted text-muted-foreground" :
    "bg-warning/20 text-warning-foreground";
  return (
    <div className="rounded-3xl bg-card p-6 shadow-card h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Zlecenia produkcyjne</h3>
          <p className="text-xs text-muted-foreground">Aktualnie realizowane na hali</p>
        </div>
        <button className="text-xs font-semibold text-primary hover:underline">Zobacz wszystkie</button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Nr</th>
              <th className="px-4 py-3 font-semibold">Produkt</th>
              <th className="px-4 py-3 font-semibold">Postęp</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const [done, total] = o.qty.split(" / ").map((n) => parseInt(n.replace(/\s/g, "")));
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{o.id}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{o.product}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">{o.qty}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge(o.tone)}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground hover:bg-accent"><Play className="h-3 w-3" /></button>
                      <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground hover:bg-accent"><Pause className="h-3 w-3" /></button>
                      <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground hover:bg-accent"><Square className="h-3 w-3" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QualityCard() {
  const rings = [
    { l: "Zgodne", v: 96, c: "text-success", d: "12 336 szt." },
    { l: "Braki", v: 3, c: "text-destructive", d: "384 szt." },
    { l: "Poprawki", v: 1, c: "text-warning-foreground", d: "128 szt." },
  ];
  const r = 42, C = 2 * Math.PI * r;
  return (
    <div className="h-full rounded-3xl bg-card p-6 shadow-card">
      <h3 className="text-lg font-semibold text-foreground">Jakość — pierwsza zmiana</h3>
      <div className="mt-4 flex items-center justify-center">
        <div className="relative h-40 w-40">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r={r} className="fill-none stroke-muted" strokeWidth="10" />
            <circle cx="50" cy="50" r={r} className="fill-none stroke-[color:var(--success)]"
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - 0.96)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold text-foreground">96%</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">FPY</div>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {rings.map((x) => (
          <div key={x.l} className="flex items-center justify-between text-sm">
            <span className={`inline-flex items-center gap-2 font-medium ${x.c}`}>
              <span className="h-2 w-2 rounded-full bg-current" /> {x.l}
            </span>
            <span className="text-muted-foreground">{x.d} · <span className="font-semibold text-foreground">{x.v}%</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AndonCard() {
  const alerts = [
    { t: "Awaria", m: "Robot RB-07 — brak sygnału bezpieczeństwa", time: "3 min", tone: "err" },
    { t: "Materiał", m: "CNC-02 — niski poziom prętów Ø20", time: "12 min", tone: "warn" },
    { t: "Jakość", m: "Prasa PR-04 — przekroczona tolerancja", time: "27 min", tone: "warn" },
    { t: "Info", m: "Linia LN-12 — planowe przezbrojenie 16:00", time: "1h", tone: "info" },
  ];
  const styles = {
    err: "border-destructive/30 bg-destructive/5 text-destructive",
    warn: "border-warning/40 bg-warning/10 text-warning-foreground",
    info: "border-border bg-muted text-foreground",
  } as const;
  return (
    <div className="h-full rounded-3xl bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Andon — zgłoszenia</h3>
          <p className="text-xs text-muted-foreground">Ostatnie 60 minut</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
          <AlertTriangle className="h-3 w-3" /> 4 aktywne
        </span>
      </div>
      <ul className="space-y-2.5">
        {alerts.map((a, i) => (
          <li key={i} className={`flex items-start gap-3 rounded-2xl border p-3 ${styles[a.tone as keyof typeof styles]}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-background/60">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">{a.t}</span>
                <span className="text-[11px] opacity-70">· {a.time} temu</span>
              </div>
              <div className="mt-0.5 truncate text-sm font-medium text-foreground">{a.m}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Widoki zakładek ---------- */

const machinesFull = [
  { name: "CNC-01 Mazak", line: "Obróbka skrawaniem", state: "Praca", oee: 91, op: "J. Nowak", order: "WO-2418", tone: "run" },
  { name: "CNC-02 DMG", line: "Obróbka skrawaniem", state: "Praca", oee: 84, op: "P. Wiśniewski", order: "WO-2414", tone: "run" },
  { name: "Prasa PR-04", line: "Tłoczenie", state: "Przezbrojenie", oee: 62, op: "M. Zieliński", order: "WO-2416", tone: "setup" },
  { name: "Robot RB-07", line: "Spawanie", state: "Awaria", oee: 12, op: "—", order: "—", tone: "down" },
  { name: "Linia LN-12", line: "Montaż", state: "Praca", oee: 78, op: "K. Lewandowska", order: "WO-2415", tone: "run" },
  { name: "Frezarka FR-03", line: "Obróbka skrawaniem", state: "Bezczynność", oee: 44, op: "—", order: "—", tone: "idle" },
  { name: "Piec PC-02", line: "Obróbka cieplna", state: "Praca", oee: 88, op: "T. Kamiński", order: "WO-2417", tone: "run" },
  { name: "Pakowarka PK-01", line: "Pakowanie", state: "Praca", oee: 73, op: "A. Dąbrowska", order: "WO-2413", tone: "run" },
];

function MachinesView() {
  const dotBg: Record<string, string> = {
    run: "bg-success", setup: "bg-warning", down: "bg-destructive", idle: "bg-muted-foreground",
  };
  const stateBadge: Record<string, string> = {
    run: "bg-success/15 text-success",
    setup: "bg-warning/20 text-warning-foreground",
    down: "bg-destructive/15 text-destructive",
    idle: "bg-muted text-muted-foreground",
  };
  return (
    <>
      <Header
        title="Maszyny"
        subtitle="Widok wszystkich zasobów produkcyjnych i ich stanu w czasie rzeczywistym."
        action={
          <button className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elegant">
            <Plus className="h-4 w-4" /> Dodaj maszynę
          </button>
        }
      />
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pracujące" value="12" delta="+1" note="z 18 maszyn" highlight />
        <KpiCard label="Przezbrojenie" value="3" delta="+1" note="w trakcie" />
        <KpiCard label="Awarie" value="1" delta="-2" note="do usunięcia" warn />
        <KpiCard label="Średnie OEE" value="76%" delta="+4%" note="ostatnie 24h" />
      </section>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {machinesFull.map((m) => (
          <div key={m.name} className="rounded-3xl bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold text-foreground">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.line}</div>
              </div>
              <span className={`relative flex h-2.5 w-2.5 rounded-full ${dotBg[m.tone]}`}>
                {m.tone === "run" && <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <div className={`text-3xl font-bold ${m.oee < 40 ? "text-destructive" : m.oee < 70 ? "text-warning-foreground" : "text-primary"}`}>{m.oee}%</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">OEE</div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${m.oee < 40 ? "bg-destructive" : m.oee < 70 ? "bg-warning" : "bg-gradient-primary"}`} style={{ width: `${m.oee}%` }} />
            </div>
            <div className="mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${stateBadge[m.tone]}`}>{m.state}</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Operator</span><span className="font-medium text-foreground">{m.op}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Zlecenie</span><span className="font-mono font-semibold text-foreground">{m.order}</span></div>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

function OrdersView() {
  return (
    <>
      <Header title="Zlecenia produkcyjne" subtitle="Lista wszystkich zleceń — plan, realizacja i status." />
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Aktywne" value="24" delta="+2" note="w realizacji" highlight />
        <KpiCard label="Zaplanowane" value="18" delta="+5" note="na 7 dni" />
        <KpiCard label="Zakończone" value="147" delta="+12%" note="ten tydzień" />
        <KpiCard label="Opóźnione" value="2" delta="-1" note="wymagają eskalacji" warn />
      </section>
      <OrdersCard />
    </>
  );
}

const maintenanceTasks = [
  { id: "MT-104", asset: "Robot RB-07", type: "Naprawa awaryjna", due: "Dziś", tech: "R. Malinowski", prio: "Krytyczny", tone: "err" },
  { id: "MT-103", asset: "Prasa PR-04", type: "Przezbrojenie", due: "Dziś", tech: "M. Zieliński", prio: "Wysoki", tone: "warn" },
  { id: "MT-102", asset: "CNC-01 Mazak", type: "Przegląd PM-3", due: "Jutro", tech: "T. Kamiński", prio: "Średni", tone: "info" },
  { id: "MT-101", asset: "Linia LN-12", type: "Smarowanie", due: "26.07", tech: "A. Dąbrowska", prio: "Niski", tone: "ok" },
  { id: "MT-100", asset: "Piec PC-02", type: "Kalibracja termopar", due: "28.07", tech: "J. Nowak", prio: "Średni", tone: "info" },
];
function MaintenanceView() {
  const prio: Record<string, string> = {
    err: "bg-destructive/15 text-destructive",
    warn: "bg-warning/20 text-warning-foreground",
    info: "bg-primary/10 text-primary",
    ok: "bg-success/15 text-success",
  };
  return (
    <>
      <Header
        title="Utrzymanie ruchu"
        subtitle="Harmonogram i zlecenia serwisowe (MTTR / MTBF)."
        action={
          <button className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elegant">
            <Plus className="h-4 w-4" /> Nowe zgłoszenie
          </button>
        }
      />
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Otwarte zgłoszenia" value="5" delta="-2" note="w tym 1 krytyczne" highlight />
        <KpiCard label="MTTR" value="42 min" delta="-8%" note="średni czas naprawy" />
        <KpiCard label="MTBF" value="86 h" delta="+6%" note="między awariami" />
        <KpiCard label="Realizacja PM" value="93%" delta="+2%" note="planowe przeglądy" />
      </section>
      <section className="rounded-3xl bg-card p-6 shadow-card">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Zlecenia serwisowe</h3>
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Nr</th><th className="px-4 py-3">Zasób</th><th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3">Termin</th><th className="px-4 py-3">Technik</th><th className="px-4 py-3">Priorytet</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceTasks.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{t.id}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{t.asset}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.type}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-foreground"><Calendar className="h-3 w-3" /> {t.due}</span></td>
                  <td className="px-4 py-3 text-foreground">{t.tech}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${prio[t.tone]}`}>{t.prio}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function AnalyticsView() {
  return (
    <>
      <Header title="Analityka produkcji" subtitle="Trendy OEE, wydajności i jakości w czasie." />
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="OEE ogólne" value="82.4%" delta="+3.1%" note="30 dni" highlight />
        <KpiCard label="Dostępność" value="91%" delta="+1.2%" note="30 dni" />
        <KpiCard label="Wydajność" value="88%" delta="+2.4%" note="30 dni" />
        <KpiCard label="Jakość (FPY)" value="96%" delta="+0.6%" note="30 dni" />
      </section>
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3 items-stretch">
        <div className="xl:col-span-2"><OeeChart /></div>
        <div className="rounded-3xl bg-card p-6 shadow-card">
          <h3 className="text-lg font-semibold text-foreground">Top przyczyny strat</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              { l: "Awarie", v: 34, t: TrendingDown, c: "text-destructive" },
              { l: "Przezbrojenia", v: 26, t: TrendingUp, c: "text-warning-foreground" },
              { l: "Braki materiału", v: 18, t: TrendingDown, c: "text-primary" },
              { l: "Mikroprzestoje", v: 12, t: TrendingUp, c: "text-muted-foreground" },
              { l: "Jakość", v: 10, t: TrendingDown, c: "text-success" },
            ].map(({ l, v, t: Icon, c }) => (
              <li key={l}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{l}</span>
                  <span className={`inline-flex items-center gap-1 font-semibold ${c}`}><Icon className="h-3 w-3" /> {v}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${v * 2.5}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3 items-stretch">
        <QualityCard />
        <div className="rounded-3xl bg-card p-6 shadow-card md:col-span-2">
          <h3 className="text-lg font-semibold text-foreground">Wydajność linii — 30 dni</h3>
          <div className="mt-6 flex h-56 items-end justify-between gap-2">
            {[62, 71, 68, 75, 80, 74, 78, 83, 79, 86, 88, 82, 90, 85].map((v, i) => (
              <div key={i} className="flex-1 rounded-t-xl bg-gradient-primary" style={{ height: `${v}%` }} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

const inventoryRows = [
  { code: "AL-220", name: "Blacha aluminiowa 2mm", stock: 420, unit: "szt.", min: 200, tone: "ok" },
  { code: "ST-14", name: "Stal C45 Ø14", stock: 88, unit: "kg", min: 100, tone: "warn" },
  { code: "PR-20", name: "Pręty Ø20 ciągnione", stock: 12, unit: "szt.", min: 40, tone: "err" },
  { code: "FL-32", name: "Kołnierz FL-32", stock: 640, unit: "szt.", min: 200, tone: "ok" },
  { code: "OL-05", name: "Olej hydrauliczny HL46", stock: 34, unit: "l", min: 20, tone: "ok" },
  { code: "SR-M8", name: "Śruba M8 x 25 DIN 933", stock: 3200, unit: "szt.", min: 1000, tone: "ok" },
];
function InventoryView() {
  const badge: Record<string, string> = {
    ok: "bg-success/15 text-success", warn: "bg-warning/20 text-warning-foreground", err: "bg-destructive/15 text-destructive",
  };
  const label: Record<string, string> = { ok: "OK", warn: "Niski", err: "Krytyczny" };
  return (
    <>
      <Header title="Magazyn" subtitle="Stany materiałów i komponentów produkcyjnych." />
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pozycji" value="1 284" delta="+12" note="w katalogu" highlight />
        <KpiCard label="Niski stan" value="14" delta="+3" note="poniżej min." warn />
        <KpiCard label="Zamówienia" value="9" delta="+2" note="w drodze" />
        <KpiCard label="Wartość" value="1.24M zł" delta="+3.2%" note="stan bieżący" />
      </section>
      <section className="rounded-3xl bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Stany magazynowe</h3>
          <button className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted">
            <Boxes className="h-3 w-3" /> Inwentaryzacja
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Kod</th><th className="px-4 py-3">Nazwa</th>
                <th className="px-4 py-3">Stan</th><th className="px-4 py-3">Minimum</th><th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {inventoryRows.map((r) => (
                <tr key={r.code} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{r.code}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                  <td className="px-4 py-3 text-foreground">{r.stock} {r.unit}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.min} {r.unit}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge[r.tone]}`}>{label[r.tone]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

const operators = [
  { name: "Anna Kowalska", role: "Kierownik produkcji", shift: "II", eff: 98, station: "Biuro" },
  { name: "Jakub Nowak", role: "Operator CNC", shift: "II", eff: 94, station: "CNC-01" },
  { name: "Piotr Wiśniewski", role: "Operator CNC", shift: "II", eff: 88, station: "CNC-02" },
  { name: "Michał Zieliński", role: "Ustawiacz", shift: "II", eff: 82, station: "Prasa PR-04" },
  { name: "Katarzyna Lewandowska", role: "Operator linii", shift: "II", eff: 91, station: "Linia LN-12" },
  { name: "Tomasz Kamiński", role: "Operator pieca", shift: "II", eff: 87, station: "Piec PC-02" },
  { name: "Aleksandra Dąbrowska", role: "Pakowanie", shift: "II", eff: 79, station: "PK-01" },
  { name: "Rafał Malinowski", role: "Technik UR", shift: "II", eff: 92, station: "Serwis" },
];
function OperatorsView() {
  return (
    <>
      <Header title="Operatorzy" subtitle="Obsada zmiany i efektywność pracy." />
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Na zmianie" value="24" delta="+2" note="obecnych" highlight />
        <KpiCard label="Nieobecni" value="1" delta="-1" note="urlop / L4" warn />
        <KpiCard label="Śr. efektywność" value="88%" delta="+2%" note="tydzień" />
        <KpiCard label="Nadgodziny" value="18 h" delta="+3h" note="tydzień" />
      </section>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {operators.map((o) => {
          const initials = o.name.split(" ").map((n) => n[0]).slice(0, 2).join("");
          return (
            <div key={o.name} className="rounded-3xl bg-card p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary text-sm font-bold text-primary-foreground shadow-elegant">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{o.name}</div>
                  <div className="text-xs text-muted-foreground">{o.role}</div>
                </div>
              </div>
              <div className="mt-4 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Stanowisko</span><span className="font-semibold text-foreground">{o.station}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Zmiana</span><span className="font-semibold text-foreground">{o.shift}</span></div>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Efektywność</span>
                  <span className="font-semibold text-foreground">{o.eff}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${o.eff}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
