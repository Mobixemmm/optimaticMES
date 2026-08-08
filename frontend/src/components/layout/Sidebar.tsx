import { useEffect, useMemo, useState } from "react";
import { Factory, LogOut, Clock } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useBootstrap } from "@/lib/bootstrap";
import { resolveIcon } from "@/lib/icons";
import { APP_NAME } from "@/lib/branding";
import { findCurrentShift } from "@/lib/shifts";
import { useAuth } from "@/lib/auth";
import { useOrdersQuery } from "@/hooks/use-orders";
import { useLatestMachineDataQuery } from "@/hooks/use-machines";
import { useMaintenanceQuery } from "@/hooks/use-maintenance";
import { useOperatorsQuery } from "@/hooks/use-operators";
import { useInventoryQuery } from "@/hooks/use-inventory";
import { useShiftsQuery } from "@/hooks/use-shifts";

// Ścieżki zostają w kodzie — odpowiadają plikom tras (routes/_dashboard.*), więc
// baza nie ma prawa ich wymyślać. Z bazy przychodzi natomiast to, KTÓRE pozycje
// są widoczne, jak się nazywają, jaką mają ikonę i w jakiej stoją kolejności
// (tabela module_configs, endpoint /bootstrap).
const MODULE_PATHS: Record<string, string> = {
  dashboard: "/",
  operatorPanel: "/operator-panel",
  machines: "/machines",
  andon: "/andon",
  orders: "/orders",
  planning: "/planning",
  bom: "/bom",
  maintenance: "/maintenance",
  quality: "/quality",
  traceability: "/traceability",
  scrap: "/scrap",
  inspections: "/inspections",
  safetyCrosses: "/safety-crosses",
  analytics: "/analytics",
  historian: "/historian",
  bi: "/bi",
  inventory: "/inventory",
  operators: "/operators",
  schedules: "/schedules",
  instructions: "/instructions",
  stepper: "/stepper",
  smartFactory: "/smart-factory",
  events: "/events",
  notifications: "/notifications",
  integrations: "/integrations",
  settings: "/settings",
};

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { bootstrap, hasModule, moduleFlag, can } = useBootstrap();
  const { logout } = useAuth();

  // Liczniki w menu pobieramy tylko dla modułów, które użytkownik faktycznie
  // widzi — inaczej gość generowałby serię odpowiedzi 403 przy każdym wejściu.
  const { data: machinesData } = useLatestMachineDataQuery({
    enabled: hasModule("machines"),
  });
  const { data: ordersData } = useOrdersQuery({ enabled: hasModule("orders") });
  const { data: maintenanceData } = useMaintenanceQuery({
    enabled: hasModule("maintenance"),
  });
  const { data: operatorsData } = useOperatorsQuery({ enabled: hasModule("operators") });
  const { data: inventoryData } = useInventoryQuery({ enabled: hasModule("inventory") });

  const machineCount = machinesData
    ? new Set(machinesData.map((m: any) => m.machine_id || m.machineId)).size
    : 0;
  const openMaintenanceCount = Array.isArray(maintenanceData)
    ? maintenanceData.filter((t: any) => t.status !== "done").length
    : 0;
  const lowStockCount = Array.isArray(inventoryData)
    ? inventoryData.filter((i: any) => Number(i.stock) < Number(i.minStock)).length
    : 0;

  const badges: Record<string, string | undefined> = {
    machines: machineCount > 0 ? String(machineCount) : "0",
    orders: Array.isArray(ordersData) ? String(ordersData.length) : "0",
    maintenance: String(openMaintenanceCount),
    operators: Array.isArray(operatorsData) ? String(operatorsData.length) : "0",
    inventory: lowStockCount > 0 ? String(lowStockCount) : undefined,
  };

  // "Ustawienia" mają własną sekcję na dole, więc wypadają z listy głównej.
  const mainNav = bootstrap.modules.filter((m) => m.key !== "settings" && MODULE_PATHS[m.key]);
  const settingsModule = bootstrap.modules.find((m) => m.key === "settings");
  const SettingsIcon = resolveIcon(settingsModule?.icon);
  const showShiftTile = moduleFlag("dashboard", "showShiftTile");

  return (
    <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col self-start overflow-y-auto rounded-3xl bg-sidebar p-5 shadow-card lg:flex">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-elegant">
          <Factory className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-bold tracking-tight text-foreground">
            {APP_NAME}
          </div>
          <div className="-mt-1 truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {bootstrap.tenant?.name ?? "MES Suite"}
          </div>
        </div>
      </div>

      <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Menu
      </div>
      <nav className="flex flex-col gap-1">
        {mainNav.map((module) => {
          const path = MODULE_PATHS[module.key];
          const Icon = resolveIcon(module.icon);
          const active = pathname === path;
          const badgeText = badges[module.key];

          return (
            <Link
              key={module.key}
              to={path}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{module.label}</span>
              {badgeText && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {badgeText}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Ogólne
      </div>
      <nav className="flex flex-col gap-1">
        {settingsModule && (
          <Link
            to={MODULE_PATHS.settings}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              pathname === MODULE_PATHS.settings
                ? "bg-gradient-primary text-primary-foreground shadow-elegant"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
          >
            <SettingsIcon className="h-4 w-4" />
            <span>{settingsModule.label}</span>
          </Link>
        )}
        {/* Pozycja „Pomoc" nie prowadziła donikąd — przycisk, który nic nie
            robi, podważa zaufanie do pozostałych. Wróci razem z dokumentacją,
            do której będzie mógł prowadzić. */}
        <button
          onClick={() => void logout()}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" />
          <span>Wyloguj</span>
        </button>
      </nav>

      {showShiftTile && (
        <div className="mt-auto pt-6">
          <SidebarShiftTile canRead={can("shifts.read")} />
        </div>
      )}
    </aside>
  );
}

/**
 * Zmiana trwająca w tej chwili, policzona z kalendarza w bazie.
 *
 * Kafelek pokazuje wyłącznie to, co da się wyprowadzić z danych. Gdy kalendarz
 * jest pusty albo żadna zmiana akurat nie trwa, mówi to wprost i prowadzi do
 * miejsca, w którym da się to uzupełnić — zamiast wyświetlać wiarygodnie
 * wyglądającą liczbę, która nie ma pokrycia.
 */
function SidebarShiftTile({ canRead }: { canRead: boolean }) {
  const { data: shifts = [] } = useShiftsQuery({ enabled: canRead });
  // Postęp zmiany musi się przesuwać bez odświeżania strony — panel na hali
  // potrafi wisieć otwarty przez całą zmianę.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const current = useMemo(() => findCurrentShift(shifts, now), [shifts, now]);

  if (!canRead) return null;

  if (!current) {
    return (
      <div className="rounded-2xl bg-gradient-dark p-4 text-primary-foreground shadow-elegant">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/15">
            <Clock className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[10px] font-medium uppercase tracking-wider opacity-70">
              Zmiana bieżąca
            </div>
            <div className="truncate text-sm font-bold">
              {shifts.length === 0 ? "Brak kalendarza" : "Poza godzinami zmian"}
            </div>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-snug opacity-80">
          {shifts.length === 0
            ? "Kalendarz zmian nie jest jeszcze zdefiniowany — bez niego nie da się policzyć czasu planowanego w OEE."
            : "Żadna zaplanowana zmiana nie obejmuje bieżącej godziny."}
        </p>
      </div>
    );
  }

  const hoursLeft = Math.floor(current.minutesLeft / 60);
  const minutesLeft = current.minutesLeft % 60;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-dark p-4 text-primary-foreground shadow-elegant">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/15">
          <Clock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[10px] font-medium uppercase tracking-wider opacity-70">
            Zmiana bieżąca
          </div>
          <div className="truncate text-sm font-bold">
            {current.name} · {current.startTime}–{current.endTime}
          </div>
        </div>
        <span className="relative flex h-2.5 w-2.5" title="Zmiana w toku">
          <span className="absolute inset-0 animate-ping rounded-full bg-success/70" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
        </span>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] opacity-80">
          <span>
            Do końca {hoursLeft > 0 ? `${hoursLeft} h ` : ""}
            {minutesLeft} min
          </span>
          <span className="font-semibold tabular-nums">{current.progressPct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-primary-foreground/15">
          <div
            className="h-full rounded-full bg-success transition-[width] duration-500"
            style={{ width: `${current.progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
