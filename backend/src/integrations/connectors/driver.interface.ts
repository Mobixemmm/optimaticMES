// Kontrakt sterownika. Dodanie nowego systemu zewnętrznego = wpis w rejestrze
// plus jedna klasa implementująca ten interfejs — reszta aplikacji (panel
// admina, synchronizacja, dziennik) nie wie i nie musi wiedzieć, z czym gada.

export interface DriverContext {
  // Pola jawne z konfiguracji połączenia (adresy, ścieżki, mapowanie pól).
  config: Record<string, unknown>;
  // Pola oznaczone w rejestrze jako `secret`, odszyfrowane na czas wywołania.
  secrets: Record<string, string>;
}

export interface ExternalOrder {
  orderNumber: string;
  productName: string;
  quantity: number;
  plannedStart?: Date | null;
  idealCycleTimeSec?: number | null;
}

export interface ExternalMaterial {
  code: string;
  name: string;
  unit: string;
  stock?: number;
}

export interface ProgressPayload {
  orderNumber: string;
  producedQuantity: number;
  scrapQuantity: number;
  status: string;
}

export interface TestResult {
  ok: boolean;
  message: string;
}

export interface IntegrationDriver {
  readonly key: string;
  test(ctx: DriverContext): Promise<TestResult>;
  pullOrders?(ctx: DriverContext): Promise<ExternalOrder[]>;
  pullMaterials?(ctx: DriverContext): Promise<ExternalMaterial[]>;
  pushProgress?(ctx: DriverContext, payload: ProgressPayload): Promise<void>;
}
