import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Następca lib/features.ts. Tamten plik trzymał piętnaście boolean-ów zaszytych
// w kodzie — tutaj cała konfiguracja UI (menu, etykiety, uprawnienia,
// terminologia) przychodzi z jednego endpointu /bootstrap i pochodzi z bazy,
// więc nowy klient albo inna branża nie wymagają zmiany frontendu.

export interface ModulePricing {
  /** W pakiecie bazowym — bez dopłaty za stanowisko. */
  inPackage: boolean;
  /** Dopłata w zł miesięcznie za stanowisko. */
  pricePerStation: number;
}

/**
 * Jak daleko moduł jest zbudowany. 'preview' znaczy: zakładka istnieje i da się
 * ją kupić, ale logiki domenowej jeszcze nie ma — widok ma to powiedzieć wprost,
 * zamiast pokazywać pustą listę udającą brak danych.
 */
export type ModuleReadiness = "ready" | "preview";

export interface BootstrapModule {
  key: string;
  label: string;
  icon: string;
  enabled: boolean;
  sortOrder: number;
  requiredPermission: string | null;
  core: boolean;
  pricing: ModulePricing;
  readiness: ModuleReadiness;
  config: Record<string, unknown>;
}

export interface BootstrapSite {
  id: number;
  code: string;
  name: string;
  timezone: string;
  isActive: boolean;
}

export interface Bootstrap {
  tenant: { id: number; slug: string; name: string; industryPack: string | null } | null;
  terminology: Record<string, string>;
  user: { id: number; email: string; name: string; role: string } | null;
  permissions: string[];
  siteScope: number[] | null;
  sites: BootstrapSite[];
  modules: BootstrapModule[];
}

// Stan zanim dojedzie odpowiedź: żadnych modułów i żadnych uprawnień.
// Świadomie pusty, nie "wszystko włączone" — inaczej przy każdym odświeżeniu
// mignęłyby zakładki, do których użytkownik nie ma prawa.
const EMPTY_BOOTSTRAP: Bootstrap = {
  tenant: null,
  terminology: {},
  user: null,
  permissions: [],
  siteScope: null,
  sites: [],
  modules: [],
};

async function fetchBootstrap(): Promise<Bootstrap> {
  const res = await fetch(`${API_URL}/bootstrap`, { credentials: "include" });
  if (res.status === 401) return EMPTY_BOOTSTRAP;
  if (!res.ok) {
    throw new Error(`Nie udało się pobrać konfiguracji (HTTP ${res.status})`);
  }
  return res.json();
}

export function useBootstrap() {
  const { data, isLoading } = useQuery({
    queryKey: ["bootstrap"],
    queryFn: fetchBootstrap,
    staleTime: 30_000,
  });

  const bootstrap = data ?? EMPTY_BOOTSTRAP;
  const moduleByKey = new Map(bootstrap.modules.map((m) => [m.key, m]));

  return {
    bootstrap,
    isLoading,

    /** Czy moduł jest włączony u tego klienta i widoczny dla tego użytkownika. */
    hasModule: (key: string) => moduleByKey.has(key),

    /** Etykieta modułu — u każdego klienta może być inna ("Zlecenia"/"Loty"). */
    moduleLabel: (key: string, fallback = "") => moduleByKey.get(key)?.label ?? fallback,

    /**
     * Ustawienie wewnątrz modułu, np. moduleFlag("orders", "allowDelete").
     * Zastępuje dawne flagi typu ALLOW_ORDER_DELETE. Domyślnie false — brak
     * konfiguracji ma znaczyć "nie wolno", a nie "wolno".
     */
    moduleFlag: (key: string, flag: string, fallback = false): boolean => {
      const value = moduleByKey.get(key)?.config?.[flag];
      return typeof value === "boolean" ? value : fallback;
    },

    moduleConfig: (key: string): Record<string, unknown> => moduleByKey.get(key)?.config ?? {},

    /** Uprawnienie z roli zdefiniowanej w bazie — nigdy nie pytamy o nazwę roli. */
    can: (permission: string) => bootstrap.permissions.includes(permission),

    /** Nazewnictwo branżowe: t("workItem") → "Zlecenie" | "Lot" | "Awizacja". */
    t: (key: string, fallback = "") => bootstrap.terminology[key] ?? fallback,

    sites: bootstrap.sites,
    terminology: bootstrap.terminology,
  };
}

// --- Panel administratora ------------------------------------------------

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Błąd ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface ModulePatch {
  key: string;
  enabled?: boolean;
  label?: string | null;
  icon?: string | null;
  sortOrder?: number;
  config?: Record<string, unknown>;
}

/**
 * Pełna lista modułów (także wyłączonych) — na potrzeby panelu admina.
 * useBootstrap() zwraca tylko to, co widoczne, więc do edycji potrzebny jest
 * osobny odczyt.
 */
export function useModulesAdmin(enabled: boolean) {
  const queryClient = useQueryClient();

  const { data: modules = [] } = useQuery({
    queryKey: ["admin", "modules"],
    queryFn: () => adminFetch<BootstrapModule[]>("/settings/modules"),
    enabled,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "modules"] });
    void queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
  };

  const updateModules = useMutation({
    mutationFn: (patches: ModulePatch[]) =>
      adminFetch("/settings/modules", {
        method: "PUT",
        body: JSON.stringify({ modules: patches }),
      }),
    onSuccess: invalidate,
  });

  const updateTerminology = useMutation({
    mutationFn: (terminology: Record<string, string>) =>
      adminFetch("/tenancy/tenant", {
        method: "PATCH",
        body: JSON.stringify({ terminology }),
      }),
    onSuccess: invalidate,
  });

  const applyPack = useMutation({
    mutationFn: (code: string) =>
      adminFetch(`/settings/industry-packs/${code}/apply`, { method: "POST" }),
    onSuccess: invalidate,
  });

  return {
    modules,
    updateModule: (patch: ModulePatch) => updateModules.mutateAsync([patch]),
    updateTerminology: (t: Record<string, string>) => updateTerminology.mutateAsync(t),
    applyPack: (code: string) => applyPack.mutateAsync(code),
    isApplyingPack: applyPack.isPending,
  };
}

export interface IndustryPackSummary {
  code: string;
  name: string;
  description: string;
  moduleCount: number;
  roleCount: number;
}

export function useIndustryPacks(enabled: boolean) {
  const { data = [] } = useQuery({
    queryKey: ["admin", "industry-packs"],
    queryFn: () => adminFetch<IndustryPackSummary[]>("/settings/industry-packs"),
    enabled,
  });
  return data;
}

export interface RoleRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  permissions: string[];
  siteScope: number[] | null;
  isSystem: boolean;
}

export function useRolesAdmin(enabled: boolean) {
  const queryClient = useQueryClient();

  const { data: roles = [] } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => adminFetch<RoleRow[]>("/roles"),
    enabled,
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ["admin", "permission-catalog"],
    queryFn: () => adminFetch<{ group: string; permissions: string[] }[]>("/roles/catalog"),
    enabled,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    void queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
  };

  const updateRole = useMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: string[] }) =>
      adminFetch(`/roles/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ permissions }),
      }),
    onSuccess: invalidate,
  });

  return {
    roles,
    catalog,
    setPermissions: (id: number, permissions: string[]) =>
      updateRole.mutateAsync({ id, permissions }),
    error: updateRole.error as Error | null,
  };
}
