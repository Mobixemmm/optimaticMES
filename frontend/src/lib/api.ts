// frontend/src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Listy w backendzie są teraz stronicowane (patrz PaginationQueryDto) i zwracają
// kopertę { data, total, page, limit, totalPages }. UI nie ma jeszcze kontrolek
// stronicowania, więc pobieramy jedną, dużą stronę i wyciągamy samo `data` —
// widoki dalej dostają zwykłą tablicę, bez zmian w komponentach.
const LIST_PAGE_LIMIT = 200;

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(errText || `Błąd ${res.status}: ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;

  // Handler Nesta, który zwraca null (np. GET /machine-stops/:machine/current
  // dla pracującej maszyny), odsyła 200 z PUSTYM ciałem — ExpressAdapter.reply()
  // robi dla wartości nil samo response.send(), bez JSON-a i bez Content-Type.
  // Bezwarunkowe res.json() rzucało tu SyntaxError, react-query trzymał wtedy
  // ostatnie udane dane i panel operatora nigdy nie wychodził z przestoju,
  // mimo że end_failure był już w bazie. Pusta odpowiedź to po prostu null.
  const text = await res.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

async function apiFetchList<T>(path: string, extraQuery = ""): Promise<T[]> {
  const sep = path.includes("?") ? "&" : "?";
  const result = await apiFetch<PaginatedResponse<T>>(
    `${path}${sep}limit=${LIST_PAGE_LIMIT}${extraQuery}`,
  );
  return result.data;
}

// --- Zlecenia ---
export const getOrders = () => apiFetchList<any>("/orders");

export const createOrder = (orderData: {
  orderNumber: string;
  productName: string;
  quantity: number;
}) => apiFetch("/orders", { method: "POST", body: JSON.stringify(orderData) });

export const updateOrderStatus = ({ id, status }: { id: number; status: string }) =>
  apiFetch(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });

export const updateOrderProgress = ({
  id,
  producedQuantity,
  scrapQuantity,
}: {
  id: number;
  producedQuantity?: number;
  scrapQuantity?: number;
}) =>
  apiFetch(`/orders/${id}/progress`, {
    method: "PATCH",
    body: JSON.stringify({ producedQuantity, scrapQuantity }),
  });

export const deleteOrder = (id: number) => apiFetch(`/orders/${id}`, { method: "DELETE" });

// --- Maszyny (dane z tabeli machine_data) ---
export const getMachinesList = () => apiFetch<string[]>("/machine-data/machines");
export const getLatestMachineData = () => apiFetch<any[]>("/machine-data");
export const getMachineLatest = (machineId: string) =>
  apiFetch(`/machine-data/${machineId}/latest`);
export const getMachineTagHistory = (machineId: string, tagName: string) =>
  apiFetch(`/machine-data/${machineId}/${tagName}`);

// --- Odczyty z czujników ---
export const getSensors = () => apiFetch("/sensors");

// --- Operatorzy ---
export const getOperators = () => apiFetchList<any>("/operators");

export const createOperator = (data: {
  firstName: string;
  lastName: string;
  rfidCardId: string;
  pinCode?: string;
  role?: string;
  station?: string;
  shift?: string;
  efficiencyPct?: number;
}) => apiFetch("/operators", { method: "POST", body: JSON.stringify(data) });

export const updateOperator = ({ id, ...data }: { id: number; [key: string]: any }) =>
  apiFetch(`/operators/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteOperator = (id: number) => apiFetch(`/operators/${id}`, { method: "DELETE" });

// --- Magazyn ---
export const getInventory = () => apiFetchList<any>("/inventory");

export const createInventoryItem = (data: {
  code: string;
  name: string;
  stock: number;
  unit: string;
  minStock: number;
  category?: string;
}) => apiFetch("/inventory", { method: "POST", body: JSON.stringify(data) });

export const updateInventoryItem = ({ id, ...data }: { id: number; [key: string]: any }) =>
  apiFetch(`/inventory/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteInventoryItem = (id: number) =>
  apiFetch(`/inventory/${id}`, { method: "DELETE" });

// --- Utrzymanie ruchu ---
export const getMaintenanceTasks = () => apiFetchList<any>("/maintenance");

export const createMaintenanceTask = (data: {
  taskNumber: string;
  asset: string;
  type: string;
  dueDate: string;
  technician: string;
  priority: string;
}) => apiFetch("/maintenance", { method: "POST", body: JSON.stringify(data) });

export const updateMaintenanceTask = ({ id, ...data }: { id: number; [key: string]: any }) =>
  apiFetch(`/maintenance/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteMaintenanceTask = (id: number) =>
  apiFetch(`/maintenance/${id}`, { method: "DELETE" });

// --- Andon ---
export const getAndonAlerts = (resolved?: boolean) =>
  apiFetchList<any>("/andon", resolved === undefined ? "" : `&resolved=${resolved}`);

export const createAndonAlert = (data: {
  type: string;
  machineId?: string;
  message: string;
  tone: "err" | "warn" | "info";
}) => apiFetch("/andon", { method: "POST", body: JSON.stringify(data) });

export const resolveAndonAlert = (id: number) =>
  apiFetch(`/andon/${id}/resolve`, { method: "PATCH" });

export const deleteAndonAlert = (id: number) => apiFetch(`/andon/${id}`, { method: "DELETE" });

// --- Przestoje maszyn ---
// Zwraca null, gdy maszyna pracuje — stąd typ z null, a nie samo zdarzenie.
export interface CurrentMachineStop {
  id: number;
  machine: string;
  reason: string;
  startFailure: string;
  endFailure: string | null;
  notes: string | null;
}

export const getCurrentMachineStop = (machine: string) =>
  apiFetch<CurrentMachineStop | null>(`/machine-stops/${encodeURIComponent(machine)}/current`);

export const startMachineStop = ({
  machine,
  reason,
  notes,
}: {
  machine: string;
  reason: string;
  notes?: string;
}) =>
  apiFetch(`/machine-stops/${encodeURIComponent(machine)}/start`, {
    method: "POST",
    body: JSON.stringify({ reason, notes }),
  });

export const endMachineStop = (machine: string) =>
  apiFetch<CurrentMachineStop | null>(`/machine-stops/${encodeURIComponent(machine)}/end`, {
    method: "POST",
  });

// --- Jakość (karty wad) ---
export interface QualityDefect {
  id: number;
  orderId: number;
  machineId: string | null;
  defectCode: string;
  quantity: number;
  disposition: "scrap" | "rework";
  status: "open" | "reworked" | "scrapped";
  detectedBy: string | null;
  detectedAt: string;
  resolvedAt: string | null;
  notes: string | null;
}

export interface QualityPareto {
  days: number;
  totalDefectCards: number;
  scrapQuantity: number;
  reworkedQuantity: number;
  openQuantity: number;
  causes: {
    code: string;
    label: string;
    quantity: number;
    pct: number;
    cumulativePct: number;
  }[];
}

export const getQualityDefects = () => apiFetchList<QualityDefect>("/quality/defects");

export const getQualityPareto = (days = 30) =>
  apiFetch<QualityPareto>(`/quality/pareto?days=${days}`);

export const createQualityDefect = (data: {
  orderId: number;
  defectCode: string;
  quantity: number;
  disposition: "scrap" | "rework";
  machineId?: string;
  detectedBy?: string;
  notes?: string;
}) => apiFetch("/quality/defects", { method: "POST", body: JSON.stringify(data) });

export const resolveQualityDefect = ({
  id,
  outcome,
}: {
  id: number;
  outcome: "reworked" | "scrapped";
}) =>
  apiFetch(`/quality/defects/${id}/resolve`, {
    method: "PATCH",
    body: JSON.stringify({ outcome }),
  });

export const deleteQualityDefect = (id: number) =>
  apiFetch(`/quality/defects/${id}`, { method: "DELETE" });

// --- Receptury (BOM) i wydania materiału ---
export interface BomItem {
  id: number;
  productName: string;
  inventoryItemId: number;
  quantityPer: number;
  notes: string | null;
  code: string;
  name: string;
  unit: string;
}

export interface MaterialConsumption {
  id: number;
  orderId: number;
  inventoryItemId: number;
  batchNumber: string;
  quantity: number;
  consumedAt: string;
  consumedBy: string | null;
  code: string;
  name: string;
  unit: string;
}

export interface OrderRequirements {
  orderId: number;
  orderNumber: string;
  productName: string;
  quantity: number;
  hasBom: boolean;
  planned: {
    inventoryItemId: number;
    code: string;
    name: string;
    unit: string;
    quantityPer: number;
    required: number;
    issued: number;
    remaining: number;
    overIssued: number;
  }[];
  unplanned: {
    inventoryItemId: number;
    code: string;
    name: string;
    unit: string;
    issued: number;
  }[];
}

export const getBomProducts = () =>
  apiFetch<{ productName: string; itemCount: number }[]>("/bom/products");

export const getBomItems = (productName: string) =>
  apiFetch<BomItem[]>(`/bom/items?productName=${encodeURIComponent(productName)}`);

export const createBomItem = (data: {
  productName: string;
  inventoryItemId: number;
  quantityPer: number;
  notes?: string;
}) => apiFetch("/bom/items", { method: "POST", body: JSON.stringify(data) });

export const updateBomItem = ({ id, ...data }: { id: number; quantityPer?: number }) =>
  apiFetch(`/bom/items/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteBomItem = (id: number) => apiFetch(`/bom/items/${id}`, { method: "DELETE" });

export const getOrderRequirements = (orderId: number) =>
  apiFetch<OrderRequirements>(`/bom/orders/${orderId}/requirements`);

export const getOrderConsumptions = (orderId: number) =>
  apiFetch<MaterialConsumption[]>(`/bom/orders/${orderId}/consumptions`);

export const consumeMaterial = (data: {
  orderId: number;
  inventoryItemId: number;
  batchNumber: string;
  quantity: number;
  consumedBy?: string;
  notes?: string;
}) => apiFetch("/bom/consumptions", { method: "POST", body: JSON.stringify(data) });

export const deleteConsumption = (id: number) =>
  apiFetch(`/bom/consumptions/${id}`, { method: "DELETE" });

// --- Genealogia (traceability) ---
export interface OrderTrace {
  order: {
    id: number;
    orderNumber: string;
    productName: string;
    quantity: number;
    producedQuantity: number;
    scrapQuantity: number;
    status: string;
    actualStart: string | null;
    actualEnd: string | null;
  };
  materials: {
    id: number;
    code: string;
    name: string;
    unit: string;
    batchNumber: string;
    quantity: number;
    consumedAt: string;
    consumedBy: string | null;
  }[];
  defects: {
    id: number;
    defectCode: string;
    label: string;
    quantity: number;
    status: string;
    machineId: string | null;
    detectedAt: string;
    detectedBy: string | null;
  }[];
  machines: string[];
  operators: {
    sessionId: number;
    operatorId: number;
    name: string;
    loginTime: string;
    logoutTime: string | null;
  }[];
  operatorsAreInferred: boolean;
}

export interface BatchTrace {
  batchNumber: string;
  found: boolean;
  material?: { code: string; name: string; unit: string } | null;
  totalQuantity: number;
  affectedOrders: {
    orderId: number;
    orderNumber: string;
    productName: string;
    status: string | null;
    producedQuantity: number;
    scrapQuantity: number;
    consumedQuantity: number;
    firstConsumedAt: string | null;
  }[];
}

export const getBatches = () =>
  apiFetch<{ batchNumber: string; orderCount: number }[]>("/traceability/batches");

export const getOrderTrace = (orderId: number) =>
  apiFetch<OrderTrace>(`/traceability/orders/${orderId}`);

export const getBatchTrace = (batchNumber: string) =>
  apiFetch<BatchTrace>(`/traceability/batches/${encodeURIComponent(batchNumber)}`);

// --- Planowanie ---
export interface PlannedOrderRow {
  id: number;
  orderNumber: string;
  productName: string;
  quantity: number;
  producedQuantity: number;
  remainingQuantity: number;
  status: string;
  sequence: number | null;
  plannedStart: string | null;
  /** null = brak czasu cyklu, pracochłonności nie da się oszacować. */
  workMinutes: number | null;
}

export interface PlanningBoard {
  days: number;
  from: string;
  until: string;
  capacityMinutesPerMachine: number;
  machines: {
    machineId: string;
    name: string;
    line: string | null;
    orders: PlannedOrderRow[];
    workMinutes: number;
    capacityMinutes: number;
    loadPct: number;
    overloaded: boolean;
    ordersWithoutEstimate: number;
  }[];
  unassigned: PlannedOrderRow[];
}

export const getPlanningBoard = (days = 7) =>
  apiFetch<PlanningBoard>(`/planning/board?days=${days}`);

export const assignOrderToMachine = ({
  id,
  ...data
}: {
  id: number;
  machineId?: string | null;
  sequence?: number;
  plannedStart?: string;
}) =>
  apiFetch(`/planning/orders/${id}/assign`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const reorderMachineQueue = (data: { machineId: string; orderIds: number[] }) =>
  apiFetch("/planning/reorder", { method: "POST", body: JSON.stringify(data) });

// --- Integracje (ERP / WMS / AODB) ---
export interface ConnectorField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "select";
  required: boolean;
  secret: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
}

export interface ConnectorDefinition {
  key: string;
  name: string;
  vendor: string;
  kind: "erp" | "wms" | "aodb" | "file";
  status: "available" | "planned";
  industries: string[];
  description: string;
  capabilities: string[];
  driver: string;
  fields: ConnectorField[];
}

export interface IntegrationConnection {
  id: number;
  connectorKey: string;
  connectorName: string;
  kind: string;
  status: "unconfigured" | "ok" | "error";
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  /** Klucze sekretów, które są ustawione. Wartości nigdy nie opuszczają serwera. */
  secretsSet: string[];
  lastError: string | null;
  lastSyncAt: string | null;
  capabilities: string[];
}

export interface SyncLogEntry {
  id: number;
  operation: string;
  status: "success" | "error";
  recordsRead: number;
  recordsWritten: number;
  message: string | null;
  durationMs: number;
  startedAt: string;
}

export const getConnectors = () => apiFetch<ConnectorDefinition[]>("/integrations/connectors");

export const getConnections = () => apiFetch<IntegrationConnection[]>("/integrations/connections");

export const createConnection = (data: {
  connectorKey: string;
  name: string;
  config?: Record<string, unknown>;
  secrets?: Record<string, string>;
}) => apiFetch("/integrations/connections", { method: "POST", body: JSON.stringify(data) });

export const updateConnection = ({
  id,
  ...data
}: {
  id: number;
  name?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
  secrets?: Record<string, string>;
}) =>
  apiFetch(`/integrations/connections/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteConnection = (id: number) =>
  apiFetch(`/integrations/connections/${id}`, { method: "DELETE" });

export const testConnection = (id: number) =>
  apiFetch<{ ok: boolean; message: string }>(`/integrations/connections/${id}/test`, {
    method: "POST",
  });

export const syncConnectionOrders = (id: number) =>
  apiFetch<{ read: number; written: number; message: string }>(
    `/integrations/connections/${id}/sync-orders`,
    { method: "POST" },
  );

export const getConnectionLogs = (id: number) =>
  apiFetch<SyncLogEntry[]>(`/integrations/connections/${id}/logs`);

// --- Analityka ---
export const getAnalyticsSummary = (days = 30) =>
  apiFetch<import("./analytics/model").AnalyticsSummary>(`/analytics/summary?days=${days}`);

// Surowe zdarzenia do pulpitu analitycznego. Przekroje liczy przeglądarka
// (lib/analytics/model.ts), dzięki czemu filtrowanie krzyżowe nie odpytuje
// serwera po każdym kliknięciu w słupek.
export const getAnalyticsDataset = (days = 30) =>
  apiFetch<import("./analytics/model").Dataset>(`/analytics/dataset?days=${days}`);

// --- Panel operatorski: konfiguracja per maszyna ---
// Przy stu maszynach nie ma jednej odpowiedzi na pytanie "jakie kafelki
// pokazać" — prasa liczy odrzut z czujnika, montaż z przycisku, a spawalnia
// w ogóle nie raportuje produkcji. Stąd konfiguracja schodzi do maszyny.

export type ScrapSource = "operator" | "telemetry" | "both";

export interface PanelModule {
  key: string;
  label: string;
  description: string;
  icon: string;
  requiresModule: string;
  requiredPermission: string | null;
  /** Czy moduł nadrzędny jest kupiony i włączony u klienta. */
  moduleEnabled: boolean;
  moduleLabel: string;
}

export interface MachinePanelConfig {
  machineId: string;
  name: string;
  line: string | null;
  panelModules: string[];
  /** false = maszyna jedzie na ustawieniach domyślnych, bez własnego wiersza. */
  isCustomized: boolean;
  scrapSource: ScrapSource;
  scrapTag: string;
  scrapDefaultCategory: string;
}

export interface MachineConfigPatch {
  panelModules?: string[];
  scrapSource?: ScrapSource;
  scrapTag?: string;
  scrapDefaultCategory?: string;
}

export const getPanelModules = () => apiFetch<PanelModule[]>("/machine-configs/panel-modules");

export const getMachineConfigs = () => apiFetch<MachinePanelConfig[]>("/machine-configs");

export const getMachineConfig = (machineId: string) =>
  apiFetch<MachinePanelConfig>(`/machine-configs/${encodeURIComponent(machineId)}`);

export const updateMachineConfig = ({
  machineId,
  ...patch
}: MachineConfigPatch & { machineId: string }) =>
  apiFetch<MachinePanelConfig>(`/machine-configs/${encodeURIComponent(machineId)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });

export const bulkUpdateMachineConfigs = (
  data: MachineConfigPatch & { machineIds?: string[]; allMachines?: boolean },
) =>
  apiFetch<{ updated: number }>("/machine-configs/bulk", {
    method: "POST",
    body: JSON.stringify(data),
  });

// --- Odrzut (SCRAP) ---

export interface ScrapCategory {
  id: number;
  code: string;
  label: string;
  group: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ScrapEvent {
  id: number;
  machineId: string;
  orderId: number | null;
  categoryCode: string | null;
  quantity: string;
  source: "operator" | "telemetry";
  operatorId: number | null;
  notes: string | null;
  recordedAt: string;
}

export interface ScrapSummary {
  days: number;
  totalQuantity: number;
  fromOperator: number;
  fromTelemetry: number;
  unclassifiedQuantity: number;
  byCategory: {
    code: string;
    label: string;
    group: string | null;
    quantity: number;
    pct: number;
  }[];
  byMachine: { machineId: string; quantity: number }[];
}

export const getScrapCategories = () => apiFetch<ScrapCategory[]>("/scrap/categories");

export const createScrapCategory = (data: {
  code: string;
  label: string;
  group?: string;
  sortOrder?: number;
}) => apiFetch<ScrapCategory>("/scrap/categories", { method: "POST", body: JSON.stringify(data) });

export const updateScrapCategory = ({ id, ...data }: { id: number; [key: string]: unknown }) =>
  apiFetch<ScrapCategory>(`/scrap/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const getScrapEvents = (days = 30, machineId?: string) =>
  apiFetch<ScrapEvent[]>(
    `/scrap/events?days=${days}${machineId ? `&machineId=${encodeURIComponent(machineId)}` : ""}`,
  );

export const getScrapSummary = (days = 30) => apiFetch<ScrapSummary>(`/scrap/summary?days=${days}`);

export const reportScrap = (data: {
  machineId: string;
  quantity: number;
  categoryCode: string;
  orderId?: number;
  operatorId?: number;
  notes?: string;
}) => apiFetch<ScrapEvent>("/scrap/report", { method: "POST", body: JSON.stringify(data) });

export const reclassifyScrap = ({
  id,
  categoryCode,
  notes,
}: {
  id: number;
  categoryCode: string;
  notes?: string;
}) =>
  apiFetch<ScrapEvent>(`/scrap/events/${id}/category`, {
    method: "PATCH",
    body: JSON.stringify({ categoryCode, notes }),
  });

export const deleteScrapEvent = (id: number) =>
  apiFetch(`/scrap/events/${id}`, { method: "DELETE" });

// --- Harmonogramy czasowe (zmiany) ---

export interface Shift {
  id: number;
  name: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export const getShifts = () => apiFetch<Shift[]>("/shifts");

export const createShift = (data: {
  name: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}) => apiFetch<Shift>("/shifts", { method: "POST", body: JSON.stringify(data) });

export const updateShift = ({ id, ...data }: { id: number; [key: string]: unknown }) =>
  apiFetch<Shift>(`/shifts/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteShift = (id: number) => apiFetch(`/shifts/${id}`, { method: "DELETE" });

// --- Preferencje zalogowanego użytkownika ---
// To NIE jest konfiguracja klienta (ta siedzi w lib/bootstrap.ts) tylko
// ustawienia jednej osoby, zapisane przy jej koncie — idą za użytkownikiem
// na inną maszynę, czego localStorage nie umie.

/** Przyczyna przestoju → kolor #rrggbb. Brak klucza = domyślny odcień motywu. */
export type ChartColorOverrides = Record<string, string>;

export interface UserPreferences {
  chartColors?: ChartColorOverrides;
}

export const getUserPreferences = () => apiFetch<UserPreferences>("/me/preferences");

// Wysyłamy pełny stan nadpisań, nie różnicę — slot pominięty w mapie wraca po
// stronie serwera do koloru domyślnego.
export const saveChartColors = (colors: ChartColorOverrides) =>
  apiFetch<ChartColorOverrides>("/me/preferences/chart-colors", {
    method: "PUT",
    body: JSON.stringify({ colors }),
  });

export const resetChartColors = () =>
  apiFetch<ChartColorOverrides>("/me/preferences/chart-colors", { method: "DELETE" });

// Konfiguracja aplikacji (moduły, terminologia, role, pakiety branżowe) żyje
// w lib/bootstrap.ts — tamten plik zastąpił dawne /settings/feature-flags.
