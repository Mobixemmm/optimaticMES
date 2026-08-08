import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBootstrap } from "./bootstrap";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Kod roli z tabeli `roles` w bazie. Świadomie nie jest to unia czterech
// wartości: klient może dodać własną rolę w panelu admina, a UI ma ją
// obsłużyć bez zmiany kodu.
export type UserRole = string;

type ApiUser = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

export type User = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatarText: string;
  roleLabel: string;
};

// Role żyją teraz w bazie i klient może dodać własne, więc to już nie jest
// kompletna lista — tylko ładniejsze nazwy dla czterech ról systemowych.
// Dla nieznanego kodu pokazujemy sam kod (patrz roleLabelFor).
const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  contributor: "Współtwórca (Contributor)",
  viewer: "Obserwator (Viewer)",
  guest: "Gość (Guest)",
};

function roleLabelFor(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

const GUEST_USER: User = {
  id: 0,
  email: "guest@optimatic.com",
  name: "Konto Gościa",
  role: "guest",
  avatarText: "GO",
  roleLabel: ROLE_LABELS.guest,
};

// Nazwy uprawnień muszą się zgadzać z backendowym katalogiem
// (backend/src/auth/permissions.constants.ts).
const P = {
  ORDERS_CREATE: "orders.create",
  ORDERS_UPDATE: "orders.update",
  ORDERS_DELETE: "orders.delete",
  MACHINES_CONTROL: "machines.control",
  MACHINES_WRITE: "machines.write",
  OPERATORS_WRITE: "operators.write",
  INVENTORY_WRITE: "inventory.write",
  INVENTORY_DELETE: "inventory.delete",
  MAINTENANCE_WRITE: "maintenance.write",
  MAINTENANCE_DELETE: "maintenance.delete",
  QUALITY_WRITE: "quality.write",
  QUALITY_DELETE: "quality.delete",
  BOM_WRITE: "bom.write",
  BOM_DELETE: "bom.delete",
  INTEGRATIONS_WRITE: "integrations.write",
  INTEGRATIONS_DELETE: "integrations.delete",
  PLANNING_WRITE: "planning.write",
  ANDON_REPORT: "andon.report",
  SENSORS_READ: "sensors.read",
  ANALYTICS_READ: "analytics.read",
  MACHINES_READ: "machines.read",
  SETTINGS_WRITE: "settings.write",
  USERS_WRITE: "users.write",
} as const;

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

function toUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.name,
    role: apiUser.role,
    avatarText: initialsOf(apiUser.name),
    roleLabel: roleLabelFor(apiUser.role),
  };
}

// Osobny, minimalny fetch helper: /auth/me musi po cichu zwrócić "brak sesji" (401) zamiast rzucać błąd.
async function authFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) return null;
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(errText || `Błąd ${res.status}: ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function fetchMe(): Promise<User> {
  const data = await authFetch<ApiUser>("/auth/me");
  return data ? toUser(data) : GUEST_USER;
}

async function fetchUsers(): Promise<User[]> {
  const data = await authFetch<ApiUser[]>("/auth/users");
  return (data ?? []).map(toUser);
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user = GUEST_USER, isLoading: isLoadingMe } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  // Uprawnienia pochodzą z roli zdefiniowanej w bazie, nie z porównania nazwy
  // roli w kodzie — dzięki temu klient może stworzyć własną rolę i od razu
  // działa ona w całym UI.
  const { can } = useBootstrap();
  const isAdmin = can(P.SETTINGS_WRITE);

  const { data: usersList = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: can(P.USERS_WRITE),
  });

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const apiUser = await authFetch<ApiUser>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!apiUser) {
        return { success: false, message: "Nieprawidłowy e-mail lub hasło!" };
      }
      queryClient.setQueryData(["me"], toUser(apiUser));
      // invalidateQueries() alone doesn't force an immediate refetch of every
      // active query here — removeQueries does, so use it to make the rest of
      // the app (orders, machines, analytics, ...) pick up the new session.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" });
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || "Błąd logowania" };
    }
  };

  const logout = async () => {
    await authFetch("/auth/logout", { method: "POST" });
    queryClient.setQueryData(["me"], GUEST_USER);
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" });
  };

  const createUserMutation = useMutation({
    mutationFn: (newUser: { name: string; email: string; pass: string; role: UserRole }) =>
      authFetch<ApiUser>("/auth/users", {
        method: "POST",
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          password: newUser.pass,
          role: newUser.role,
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const createUser = (newUser: { name: string; email: string; pass: string; role: UserRole }) =>
    createUserMutation.mutateAsync(newUser);

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: UserRole }) =>
      authFetch<ApiUser>(`/auth/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (updated && user.id === variables.userId) {
        queryClient.setQueryData(["me"], toUser(updated));
      }
    },
  });

  const updateUserRole = (userId: number, role: UserRole) =>
    updateUserRoleMutation.mutateAsync({ userId, role });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => authFetch(`/auth/users/${userId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const deleteUser = (userId: number) => deleteUserMutation.mutateAsync(userId);

  // Cienka warstwa nazw czytelnych dla widoków nad listą uprawnień z serwera.
  // Wcześniej każde pole było porównaniem do zaszytej na sztywno nazwy roli —
  // przez co dodanie roli "Brygadzista" wymagało zmiany tego pliku. Teraz
  // źródłem prawdy jest tabela `roles`, a to jest wyłącznie mapowanie nazw.
  const permissions = {
    canManageFeatureFlags: can(P.SETTINGS_WRITE),
    canManageUsers: can(P.USERS_WRITE),
    canDeleteOrder: can(P.ORDERS_DELETE),
    canCreateOrder: can(P.ORDERS_CREATE),
    canChangeOrderStatus: can(P.ORDERS_UPDATE),
    canOpenOperatorPanel: can(P.MACHINES_READ),
    canViewAnalytics: can(P.ANALYTICS_READ),
    canViewSensors: can(P.SENSORS_READ),
    canManageOperators: can(P.OPERATORS_WRITE),
    canManageInventory: can(P.INVENTORY_WRITE),
    canDeleteInventory: can(P.INVENTORY_DELETE),
    canManageMaintenance: can(P.MAINTENANCE_WRITE),
    canDeleteMaintenance: can(P.MAINTENANCE_DELETE),
    canManageQuality: can(P.QUALITY_WRITE),
    canDeleteQuality: can(P.QUALITY_DELETE),
    canManageBom: can(P.BOM_WRITE),
    canDeleteBom: can(P.BOM_DELETE),
    canManageIntegrations: can(P.INTEGRATIONS_WRITE),
    canDeleteIntegrations: can(P.INTEGRATIONS_DELETE),
    canManagePlanning: can(P.PLANNING_WRITE),
    canReportAndon: can(P.ANDON_REPORT),
    canControlMachines: can(P.MACHINES_CONTROL),
    canManageMachines: can(P.MACHINES_WRITE),
  };

  return {
    user,
    usersList,
    login,
    logout,
    createUser,
    updateUserRole,
    deleteUser,
    isAdmin,
    // "Gość" znaczy teraz "brak sesji" (GUEST_USER ma id 0), a nie "rola o
    // nazwie guest". Wcześniej użytkownik zalogowany na konto z rolą `guest`
    // widział w TopBarze przycisk "Zaloguj się", mimo że sesję już miał.
    isGuest: user.id === 0,
    // Trwa pierwsze sprawdzenie sesji (/auth/me) — dopóki nie wiadomo, czy
    // ktoś jest zalogowany, nie pokazujemy jeszcze ekranu logowania.
    isLoadingMe,
    permissions,
  };
}
