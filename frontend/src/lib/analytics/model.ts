import type { FilterDimension, FilterState } from "./filters";

export interface DatasetMachine {
  machineId: string;
  name: string;
  line: string | null;
  siteId: number | null;
  areaId: number | null;
  targetOeePct: number | null;
}

export interface DatasetStop {
  id: number;
  machineId: string;
  reason: string;
  reasonLabel: string;
  startTime: string;
  endTime: string | null;
  minutes: number;
  notes: string | null;
}

export interface DatasetOrder {
  id: number;
  orderNumber: string;
  productName: string;
  status: string;
  quantity: number;
  producedQuantity: number;
  scrapQuantity: number;
  idealCycleTimeSec: number | null;
  actualStart: string | null;
  actualEnd: string | null;
}

export interface Dataset {
  range: { from: string; to: string; days: number };
  machines: DatasetMachine[];
  stops: DatasetStop[];
  orders: DatasetOrder[];
  plannedMinutesByDay: { date: string; minutesPerMachine: number }[];
}

// Kształt odpowiedzi /analytics/summary — agregaty liczone po stronie serwera,
// używane przez kafelki pulpitu. Musi zgadzać się z tym, co zwraca
// AnalyticsService.getSummary().
export interface AnalyticsSummary {
  production: { produced: number; scrap: number; good: number };
  oee: {
    availability: number;
    performance: number;
    quality: number;
    overall: number;
    performanceMethod: "cycle_time" | "quantity_ratio";
  };
  mttrMinutes: number | null;
  mtbfHours: number | null;
  lossReasons: { reason: string; label: string; pct: number }[];
  dailyAvailability: { date: string; pct: number }[];
  shift: { planned: number; produced: number; pct: number; remainingMinutes: number };
  machinesStatus: {
    machineId: string;
    name: string;
    /** Etykieta stanu do pokazania: nazwa przyczyny postoju albo „Praca". */
    state: string;
    /** Kod przyczyny otwartego przestoju; null gdy maszyna pracuje. */
    reason: string | null;
    oeeApprox: number;
  }[];
  andon: {
    activeCount: number;
    recent: {
      id: number;
      type: string;
      machineId: string | null;
      message: string;
      tone: "info" | "warn" | "err";
      isResolved: boolean;
      createdAt: string;
      resolvedAt: string | null;
    }[];
  };
  maintenance: { openCount: number; criticalCount: number };
  operators: { onShiftCount: number; avgEfficiency: number | null };
}

export const EMPTY_DATASET: Dataset = {
  range: { from: "", to: "", days: 0 },
  machines: [],
  stops: [],
  orders: [],
  plannedMinutesByDay: [],
};

// Klucz dnia w czasie lokalnym — musi zgadzać się z tym, co liczy backend
// (AnalyticsDatasetService.toDateKey), inaczej filtr po dniu rozjechałby się
// z osią czasu o strefę.
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type MachineIndex = Map<string, DatasetMachine>;

export function indexMachines(machines: DatasetMachine[]): MachineIndex {
  return new Map(machines.map((m) => [m.machineId, m]));
}

function stopDimensionValue(
  stop: DatasetStop,
  dimension: FilterDimension,
  machines: MachineIndex,
): string | null {
  switch (dimension) {
    case "machine":
      return stop.machineId;
    case "reason":
      return stop.reason;
    case "day":
      return dayKey(stop.startTime);
    case "line":
      return machines.get(stop.machineId)?.line ?? null;
    // Status zlecenia nie opisuje przestoju — ten wymiar go nie dotyczy.
    case "orderStatus":
      return null;
  }
}

/**
 * Sedno filtrowania krzyżowego: wizual NIE filtruje sam siebie.
 *
 * Klikając „Awaria" na wykresie przyczyn chcemy zobaczyć, jak awarie rozkładają
 * się na maszyny — ale sam wykres przyczyn musi dalej pokazywać wszystkie
 * kategorie, żeby dało się zmienić zdanie i kliknąć inną. Dlatego liczymy dane
 * dla wymiaru X, pomijając filtry NA wymiarze X, a zaznaczone wartości tylko
 * podświetlamy. Bez tej reguły kliknięcie zostawiałoby na wykresie jeden słupek
 * i użytkownik nie miałby jak wrócić.
 */
export function filterStops(
  stops: DatasetStop[],
  filters: FilterState,
  machines: MachineIndex,
  exceptDimension?: FilterDimension,
): DatasetStop[] {
  const dimensions = (Object.keys(filters) as FilterDimension[]).filter(
    (d) => d !== exceptDimension && filters[d].length > 0,
  );
  if (dimensions.length === 0) return stops;

  return stops.filter((stop) =>
    dimensions.every((dimension) => {
      const value = stopDimensionValue(stop, dimension, machines);
      // Wymiar nieopisujący przestoju (status zlecenia) go nie odrzuca —
      // inaczej filtr ze zleceń wyczyściłby wszystkie wykresy przestojów.
      if (value === null) return true;
      return filters[dimension].includes(value);
    }),
  );
}

/**
 * Zlecenia nie mają w modelu danych powiązania z maszyną (production_orders nie
 * niesie machine_id), więc filtry po maszynie i linii ich NIE dotyczą.
 * Zwracamy to jawnie, żeby widok mógł o tym uprzedzić zamiast po cichu pokazać
 * liczby niezgodne z resztą pulpitu.
 */
export const ORDER_BLIND_DIMENSIONS: FilterDimension[] = ["machine", "line"];

export function filterOrders(
  orders: DatasetOrder[],
  filters: FilterState,
  exceptDimension?: FilterDimension,
): DatasetOrder[] {
  return orders.filter((order) => {
    if (
      exceptDimension !== "day" &&
      filters.day.length > 0 &&
      !(order.actualStart && filters.day.includes(dayKey(order.actualStart)))
    ) {
      return false;
    }
    if (
      exceptDimension !== "orderStatus" &&
      filters.orderStatus.length > 0 &&
      !filters.orderStatus.includes(order.status)
    ) {
      return false;
    }
    return true;
  });
}

export function ordersIgnoreActiveFilters(filters: FilterState): FilterDimension[] {
  return ORDER_BLIND_DIMENSIONS.filter((d) => filters[d].length > 0);
}

// --- Przekroje --------------------------------------------------------------

export interface Slice {
  key: string;
  label: string;
  value: number;
}

export function sumBy(
  stops: DatasetStop[],
  keyOf: (stop: DatasetStop) => string | null,
  labelOf: (key: string) => string,
): Slice[] {
  const totals = new Map<string, number>();
  for (const stop of stops) {
    const key = keyOf(stop);
    if (key === null) continue;
    totals.set(key, (totals.get(key) ?? 0) + stop.minutes);
  }
  return [...totals.entries()]
    .map(([key, value]) => ({ key, label: labelOf(key), value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Kartoteka potrafi liczyć setki maszyn — tyle słupków to nie jest wykres,
 * tylko ściana. Pokazujemy czoło rankingu, a ogon składamy w jedną pozycję.
 * Pozycja „Pozostałe" jest nieklikalna: nie reprezentuje jednej wartości
 * wymiaru, więc nie da się po niej sensownie filtrować.
 */
export const OTHERS_KEY = "__others__";

export function topNWithOthers(slices: Slice[], limit: number): Slice[] {
  if (slices.length <= limit) return slices;
  const head = slices.slice(0, limit);
  const tailTotal = slices.slice(limit).reduce((sum, s) => sum + s.value, 0);
  if (tailTotal <= 0) return head;
  return [
    ...head,
    {
      key: OTHERS_KEY,
      label: `Pozostałe (${slices.length - limit})`,
      value: tailTotal,
    },
  ];
}

// --- Wskaźniki --------------------------------------------------------------

export interface Kpis {
  availability: number;
  performance: number;
  quality: number;
  overall: number;
  downtimeMinutes: number;
  plannedMinutes: number;
  produced: number;
  scrap: number;
  good: number;
  failureCount: number;
  openStops: number;
  machineCount: number;
  performanceMethod: "cycle_time" | "quantity_ratio";
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

/**
 * Wskaźniki liczone dokładnie z tego samego zbioru, który widać na wykresach —
 * dlatego kafelki zmieniają się razem z filtrem i zawsze zgadzają się z resztą
 * pulpitu.
 */
export function computeKpis(dataset: Dataset, filters: FilterState, machines: MachineIndex): Kpis {
  const stops = filterStops(dataset.stops, filters, machines);
  const downtimeStops = stops.filter((s) => s.reason !== "planned");
  const downtimeMinutes = downtimeStops.reduce((sum, s) => sum + s.minutes, 0);

  // Czas planowany musi być zawężony tak samo jak przestoje, inaczej
  // dostępność po wyborze jednej maszyny wyszłaby absurdalnie wysoka
  // (jej przestoje wobec planu całego zakładu).
  const machinesInScope = dataset.machines.filter((m) => {
    if (filters.machine.length > 0 && !filters.machine.includes(m.machineId)) {
      return false;
    }
    if (filters.line.length > 0 && !(m.line && filters.line.includes(m.line))) {
      return false;
    }
    return true;
  });
  const daysInScope =
    filters.day.length > 0
      ? dataset.plannedMinutesByDay.filter((d) => filters.day.includes(d.date))
      : dataset.plannedMinutesByDay;
  const plannedPerMachine = daysInScope.reduce((sum, d) => sum + d.minutesPerMachine, 0);
  const plannedMinutes = Math.max(1, Math.max(1, machinesInScope.length) * plannedPerMachine);

  const availability = clamp01(1 - downtimeMinutes / plannedMinutes);
  const operatingMinutes = Math.max(0, plannedMinutes - downtimeMinutes);

  const orders = filterOrders(dataset.orders, filters);
  const produced = orders.reduce((s, o) => s + (o.producedQuantity || 0), 0);
  const scrap = orders.reduce((s, o) => s + (o.scrapQuantity || 0), 0);
  const quantity = orders.reduce((s, o) => s + (o.quantity || 0), 0);

  // Performance wg definicji OEE wymaga wzorcowego czasu cyklu. Gdy zlecenia go
  // nie mają, spadamy do przybliżenia wykonane/zaplanowane i mówimy o tym
  // wprost (performanceMethod) — widok to pokazuje, żeby nikt nie brał
  // przybliżenia za pomiar.
  const withCycleTime = orders.filter(
    (o) => o.idealCycleTimeSec != null && o.idealCycleTimeSec > 0,
  );
  const idealSeconds = withCycleTime.reduce(
    (s, o) => s + (o.idealCycleTimeSec as number) * (o.producedQuantity || 0),
    0,
  );
  let performance: number;
  let performanceMethod: Kpis["performanceMethod"];
  if (withCycleTime.length > 0 && operatingMinutes > 0) {
    performance = clamp01(idealSeconds / (operatingMinutes * 60));
    performanceMethod = "cycle_time";
  } else {
    performance = quantity > 0 ? clamp01(produced / quantity) : 0;
    performanceMethod = "quantity_ratio";
  }

  const quality = produced > 0 ? clamp01(1 - scrap / produced) : 1;

  return {
    availability: round1(availability * 100),
    performance: round1(performance * 100),
    quality: round1(quality * 100),
    overall: round1(availability * performance * quality * 100),
    downtimeMinutes: Math.round(downtimeMinutes),
    plannedMinutes: Math.round(plannedMinutes),
    produced,
    scrap,
    good: Math.max(0, produced - scrap),
    failureCount: downtimeStops.filter((s) => s.reason === "failure").length,
    openStops: stops.filter((s) => s.endTime === null).length,
    machineCount: machinesInScope.length,
    performanceMethod,
  };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function formatMinutes(totalMinutes: number): string {
  const minutes = Math.round(totalMinutes);
  if (minutes < 60) return `${minutes} min`;

  const h = Math.floor(minutes / 60);
  // Czas planowany całego zakładu idzie w tysiące godzin — „85008 h" jest
  // formalnie poprawne, ale nikt tego nie czyta. Powyżej dwóch dób
  // przechodzimy na dni.
  if (h >= 48) {
    const d = Math.floor(h / 24);
    const restH = h % 24;
    return restH === 0 ? `${d} dni` : `${d} dni ${restH} h`;
  }

  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
  });
}
