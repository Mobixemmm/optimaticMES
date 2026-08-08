import { useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  KeyRound,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Type,
  Users,
  X,
} from "lucide-react";
import {
  useBootstrap,
  useModulesAdmin,
  useIndustryPacks,
  useRolesAdmin,
  type BootstrapModule,
  type RoleRow,
} from "@/lib/bootstrap";
import { ICON_NAMES, resolveIcon } from "@/lib/icons";
import {
  KPI_ACTION_LABEL,
  KPI_NAVIGATION_TARGETS,
  KPI_REGISTRY,
  resolveKpiAction,
  type KpiAction,
} from "@/lib/analytics/kpi-actions";
import { useAuth, type User, type UserRole } from "@/lib/auth";
import { Header } from "@/components/shared/Header";
import { PricingSection } from "@/components/settings/PricingSection";
import { MachinePanelsSection } from "@/components/settings/MachinePanelsSection";
import { SectionHeading } from "@/components/settings/SectionHeading";

// Czytelne nazwy ustawień wewnątrz modułów. Klucze odpowiadają polom
// module_configs.config po stronie backendu (MODULE_DEFINITIONS.defaultConfig).
// Brak wpisu nie jest błędem — nieznany klucz dostanie nazwę wygenerowaną
// z samego identyfikatora, więc dodanie ustawienia w backendzie nie wymaga
// zmiany frontendu, żeby było edytowalne.
const MODULE_SETTING_LABELS: Record<string, Record<string, string>> = {
  dashboard: {
    showKpiCards: "Kafelki KPI na pulpicie",
    showOeeChart: "Wykres OEE",
    showShiftTile: "Kafelek bieżącej zmiany w menu",
  },
  machines: {
    temperatureStream: "Podgląd temperatur na żywo",
    operatorPanel: "Panel operatora po kliknięciu maszyny",
    allowAddMachine: "Przycisk dodawania maszyny",
  },
  orders: {
    allowCreate: "Tworzenie",
    allowStatusChange: "Zmiana statusu",
    allowDelete: "Usuwanie",
  },
};

function settingLabel(moduleKey: string, settingKey: string): string {
  const known = MODULE_SETTING_LABELS[moduleKey]?.[settingKey];
  if (known) return known;
  const spaced = settingKey.replace(/([A-Z])/g, " $1").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const TERMINOLOGY_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "workItem", label: "Jednostka pracy", hint: "Zlecenie / Lot / Awizacja" },
  { key: "workItemPlural", label: "Jednostka pracy (l. mn.)", hint: "Zlecenia / Loty" },
  { key: "asset", label: "Zasób", hint: "Maszyna / Stanowisko / Urządzenie" },
  { key: "assetPlural", label: "Zasób (l. mn.)", hint: "Maszyny / Stanowiska" },
  { key: "operator", label: "Pracownik", hint: "Operator / Dyżurny / Magazynier" },
  { key: "operatorPlural", label: "Pracownik (l. mn.)", hint: "Operatorzy / Dyżurni" },
  { key: "site", label: "Zakład", hint: "Zakład / Terminal / Magazyn" },
  { key: "area", label: "Obszar", hint: "Linia / Hala / Strefa" },
];

export function SettingsView() {
  const { isAdmin, login, logout, user } = useAuth();
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const res = await login(emailInput, passInput);
    if (!res.success) {
      setLoginError(res.message || "Błąd logowania");
    }
  };

  if (!isAdmin) {
    return (
      <>
        <Header
          title="Ustawienia"
          subtitle="Zaloguj się na konto z uprawnieniem settings.write, aby zarządzać konfiguracją systemu."
        />

        <div className="mx-auto max-w-md mt-6 rounded-3xl bg-card p-8 shadow-card border border-border space-y-6">
          <div className="text-center space-y-1">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-foreground mb-2">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Logowanie administratora</h3>
            <p className="text-xs text-muted-foreground">
              Panel konfiguracji wymaga uprawnienia <code>settings.write</code>
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-destructive/15 text-destructive text-xs font-semibold text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                Adres e-mail
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full rounded-2xl bg-muted p-3 text-sm font-medium text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="imie.nazwisko@firma.pl"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                Hasło
              </label>
              <input
                type="password"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                className="w-full rounded-2xl bg-muted p-3 text-sm font-medium text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elegant hover:opacity-90 transition"
            >
              Zaloguj się
            </button>
          </form>

          {/* Stała tu ramka z domyślnym loginem i hasłem wypisanym wprost pod
              formularzem. Wypisywanie danych dostępowych na ekranie logowania
              mówi klientowi, że traktujemy je jak element makiety — nawet gdy
              chodzi o konto zakładane skryptem seed. */}
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Panel administratora"
        subtitle="Moduły, nazewnictwo, role i użytkownicy — cała konfiguracja aplikacji w jednym miejscu."
        action={
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full bg-muted px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition"
          >
            Wyloguj się ({user.email})
          </button>
        }
      />

      <div className="space-y-8">
        <IndustryPackSection />
        <ModulesSection />
        <PricingSection />
        <MachinePanelsSection />
        <KpiActionsSection />
        <TerminologySection />
        <RolesSection />
        <UserManagementSection />
      </div>
    </>
  );
}

// --- Pakiety branżowe -----------------------------------------------------

function IndustryPackSection() {
  const { bootstrap } = useBootstrap();
  const packs = useIndustryPacks(true);
  const { applyPack, isApplyingPack } = useModulesAdmin(true);
  const [error, setError] = useState("");

  const current = bootstrap.tenant?.industryPack;

  return (
    <div className="rounded-3xl bg-card p-6 shadow-card border border-border/50">
      <SectionHeading
        icon={Building2}
        title="Pakiet branżowy"
        description="Ustawia moduły, ich nazwy i nazewnictwo pod daną branżę. To tylko punkt startowy — po nałożeniu wszystko zostaje edytowalne poniżej."
      />

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/15 text-destructive text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {packs.map((pack) => {
          const active = pack.code === current;
          return (
            <div
              key={pack.code}
              className={`rounded-2xl border p-4 transition ${
                active ? "border-primary bg-primary/5" : "border-border bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-foreground">{pack.name}</h4>
                {active && (
                  <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                    AKTYWNY
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground min-h-[3rem]">{pack.description}</p>
              <button
                disabled={isApplyingPack}
                onClick={async () => {
                  setError("");
                  if (
                    !confirm(
                      `Nałożyć pakiet „${pack.name}"? Nadpisze nazwy modułów i nazewnictwo, ale nie skasuje danych ani istniejących ról.`,
                    )
                  ) {
                    return;
                  }
                  try {
                    await applyPack(pack.code);
                  } catch (err: any) {
                    setError(err.message || "Nie udało się nałożyć pakietu");
                  }
                }}
                className="mt-3 w-full rounded-full bg-muted py-2 text-xs font-bold text-foreground hover:bg-accent transition disabled:opacity-50"
              >
                {active ? "Nałóż ponownie" : "Nałóż pakiet"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Moduły ---------------------------------------------------------------

function ModulesSection() {
  const { modules, updateModule } = useModulesAdmin(true);
  const [error, setError] = useState("");

  const save = async (patch: Parameters<typeof updateModule>[0]) => {
    setError("");
    try {
      await updateModule(patch);
    } catch (err: any) {
      setError(err.message || "Nie udało się zapisać zmiany");
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeading
        icon={SlidersHorizontal}
        title="Moduły"
        description="Włącz lub wyłącz moduł, zmień jego nazwę w menu, ikonę i kolejność. Wyłączony moduł znika z nawigacji, a backend odrzuca żądania bez wymaganego uprawnienia — to nie jest samo ukrycie przycisku."
      />

      {error && (
        <div className="p-3 rounded-xl bg-destructive/15 text-destructive text-xs font-semibold">
          {error}
        </div>
      )}

      {modules.map((module) => (
        <ModuleRow key={module.key} module={module} onSave={save} />
      ))}
    </div>
  );
}

function ModuleRow({
  module,
  onSave,
}: {
  module: BootstrapModule;
  onSave: (patch: {
    key: string;
    enabled?: boolean;
    label?: string;
    icon?: string;
    sortOrder?: number;
    config?: Record<string, unknown>;
  }) => Promise<void>;
}) {
  const [label, setLabel] = useState(module.label);
  const Icon = resolveIcon(module.icon);
  const settingKeys = Object.keys(module.config);

  // Po nałożeniu pakietu branżowego etykiety zmieniają się na serwerze —
  // lokalny stan pola musi za tym nadążyć, inaczej pokazywałby starą nazwę.
  useEffect(() => setLabel(module.label), [module.label]);

  return (
    <div className="rounded-3xl bg-card p-5 shadow-card border border-border/50">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-[12rem] flex-1">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => {
              if (label.trim() && label !== module.label) {
                void onSave({ key: module.key, label: label.trim() });
              }
            }}
            className="w-full rounded-xl bg-muted px-3 py-2 text-sm font-bold text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] text-muted-foreground">
              {module.key}
              {module.requiredPermission && ` · wymaga ${module.requiredPermission}`}
            </span>
            {/* Cena stoi przy przełączniku, a nie w osobnym cenniku — decyzja
                „włączam moduł" jest decyzją o rachunku i ma to być widoczne
                w chwili klikania. */}
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                module.pricing.inPackage
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary/15 text-primary"
              }`}
            >
              {module.pricing.inPackage
                ? "w pakiecie"
                : `+${module.pricing.pricePerStation} zł / stanowisko`}
            </span>
            {module.readiness === "preview" && (
              <span
                className="rounded bg-warning/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-warning-foreground"
                title="Zakładka i cennik są gotowe, logiki domenowej jeszcze nie ma"
              >
                w budowie
              </span>
            )}
          </div>
        </div>

        <label className="text-xs font-semibold text-muted-foreground">
          Ikona
          <select
            value={module.icon}
            onChange={(e) => void onSave({ key: module.key, icon: e.target.value })}
            className="ml-2 rounded-xl bg-muted px-2 py-1.5 text-xs font-semibold text-foreground border border-border outline-none focus:border-primary"
          >
            {ICON_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold text-muted-foreground">
          Kolejność
          <input
            type="number"
            defaultValue={module.sortOrder}
            onBlur={(e) => {
              const next = Number.parseInt(e.target.value, 10);
              if (Number.isFinite(next) && next !== module.sortOrder) {
                void onSave({ key: module.key, sortOrder: next });
              }
            }}
            className="ml-2 w-20 rounded-xl bg-muted px-2 py-1.5 text-xs font-semibold text-foreground border border-border outline-none focus:border-primary"
          />
        </label>

        {module.core ? (
          <span
            className="rounded-lg border border-border bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground"
            title="Moduł wymagany — bez niego nie dałoby się wrócić do panelu administratora"
          >
            WYMAGANY
          </span>
        ) : (
          <Toggle
            on={module.enabled}
            onChange={(next) => void onSave({ key: module.key, enabled: next })}
          />
        )}
      </div>

      {settingKeys.length > 0 && (
        <ul className="mt-4 divide-y divide-border/60 border-t border-border/60 pt-1">
          {settingKeys.map((settingKey) => {
            const value = module.config[settingKey];
            if (typeof value !== "boolean") return null;
            return (
              <li key={settingKey} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs font-semibold text-foreground">
                  {settingLabel(module.key, settingKey)}
                </span>
                <Toggle
                  on={value}
                  onChange={(next) =>
                    void onSave({ key: module.key, config: { [settingKey]: next } })
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-200 ${
        on ? "bg-gradient-primary shadow-elegant" : "bg-muted border border-border"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-card shadow-md transition-all duration-200 flex items-center justify-center text-[10px] font-bold ${
          on ? "left-[24px] text-primary" : "left-1 text-muted-foreground"
        }`}
      >
        {on ? "1" : "0"}
      </span>
    </button>
  );
}

// --- Akcje kafelków KPI ---------------------------------------------------

function KpiActionsSection() {
  const { modules, updateModule } = useModulesAdmin(true);
  const [error, setError] = useState("");

  const configurable = modules.filter((m) => KPI_REGISTRY[m.key]);

  const save = async (module: BootstrapModule, kpiKey: string, action: KpiAction) => {
    setError("");
    // Backend scala `config` płytko, więc podmiana jednego kafelka wymaga
    // wysłania całej mapy kpiActions — inaczej pozostałe wpisy by zniknęły.
    const current = (module.config?.kpiActions as Record<string, KpiAction>) ?? {};
    try {
      await updateModule({
        key: module.key,
        config: { kpiActions: { ...current, [kpiKey]: action } },
      });
    } catch (err: any) {
      setError(err.message || "Nie udało się zapisać akcji kafelka");
    }
  };

  return (
    <div className="rounded-3xl bg-card p-6 shadow-card border border-border/50">
      <SectionHeading
        icon={BarChart3}
        title="Kliknięcie kafelka KPI"
        description="Każdy kafelek może rozwinąć szczegóły na miejscu, przenieść na wskazaną stronę albo nałożyć filtr na pulpicie analitycznym."
      />

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/15 text-destructive text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {configurable.map((module) => (
          <div key={module.key}>
            <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {module.label}
            </div>
            <ul className="space-y-2">
              {KPI_REGISTRY[module.key].map((kpi) => {
                const action = resolveKpiAction(module.key, kpi.key, module.config);
                return (
                  <li
                    key={kpi.key}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3"
                  >
                    <span className="min-w-[12rem] flex-1 text-sm font-semibold text-foreground">
                      {kpi.label}
                    </span>

                    <select
                      value={action.type}
                      onChange={(e) =>
                        void save(module, kpi.key, {
                          type: e.target.value as KpiAction["type"],
                          // Przy przełączeniu na „przejdź do strony" trzeba od razu
                          // podać cel, inaczej resolveKpiAction odrzuci wpis jako
                          // niekompletny i kafelek wróci do zachowania domyślnego.
                          to:
                            e.target.value === "navigate"
                              ? (action.to ?? KPI_NAVIGATION_TARGETS[0].path)
                              : undefined,
                        })
                      }
                      className="rounded-xl bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground border border-border outline-none focus:border-primary"
                    >
                      {(Object.keys(KPI_ACTION_LABEL) as KpiAction["type"][])
                        // „Nałóż filtr" wymaga wskazania wymiaru i wartości,
                        // czego nie da się sensownie wyklikać bez znajomości
                        // danych — zostaje dostępne przez API, nie tutaj.
                        .filter((type) => type !== "filter")
                        .map((type) => (
                          <option key={type} value={type}>
                            {KPI_ACTION_LABEL[type]}
                          </option>
                        ))}
                    </select>

                    {action.type === "navigate" && (
                      <select
                        value={action.to ?? KPI_NAVIGATION_TARGETS[0].path}
                        onChange={(e) =>
                          void save(module, kpi.key, { type: "navigate", to: e.target.value })
                        }
                        className="rounded-xl bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground border border-border outline-none focus:border-primary"
                      >
                        {KPI_NAVIGATION_TARGETS.map((target) => (
                          <option key={target.path} value={target.path}>
                            {target.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Terminologia ---------------------------------------------------------

function TerminologySection() {
  const { terminology } = useBootstrap();
  const { updateTerminology } = useModulesAdmin(true);
  const [error, setError] = useState("");

  return (
    <div className="rounded-3xl bg-card p-6 shadow-card border border-border/50">
      <SectionHeading
        icon={Type}
        title="Nazewnictwo"
        description="Te słowa aplikacja wstawia w nagłówkach i komunikatach. Dzięki nim ten sam kod obsługuje fabrykę („Zlecenie”), lotnisko („Lot”) i magazyn („Awizacja”)."
      />

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/15 text-destructive text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TERMINOLOGY_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
              {field.label}
            </label>
            <input
              defaultValue={terminology[field.key] ?? ""}
              key={`${field.key}:${terminology[field.key] ?? ""}`}
              placeholder={field.hint}
              onBlur={async (e) => {
                const next = e.target.value.trim();
                if (!next || next === terminology[field.key]) return;
                setError("");
                try {
                  await updateTerminology({ [field.key]: next });
                } catch (err: any) {
                  setError(err.message || "Nie udało się zapisać nazewnictwa");
                }
              }}
              className="w-full rounded-2xl bg-muted p-2.5 text-sm font-medium text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">{field.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Role i uprawnienia ---------------------------------------------------

function RolesSection() {
  const { roles, catalog, setPermissions } = useRolesAdmin(true);
  const [openRoleId, setOpenRoleId] = useState<number | null>(null);
  const [error, setError] = useState("");

  return (
    <div className="rounded-3xl bg-card p-6 shadow-card border border-border/50">
      <SectionHeading
        icon={KeyRound}
        title="Role i uprawnienia"
        description="Uprawnienia są egzekwowane po stronie serwera przy każdym żądaniu, nie tylko ukrywają elementy interfejsu."
      />

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/15 text-destructive text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {roles.map((role) => (
          <div key={role.id} className="rounded-2xl border border-border bg-muted/30 p-4">
            <button
              onClick={() => setOpenRoleId(openRoleId === role.id ? null : role.id)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{role.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{role.code}</span>
                  {role.isSystem && (
                    <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                      SYSTEMOWA
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {role.description ?? "—"} · {role.permissions.length} uprawnień
                </p>
              </div>
              <span className="shrink-0 text-xs font-bold text-muted-foreground">
                {openRoleId === role.id ? "▲" : "▼"}
              </span>
            </button>

            {openRoleId === role.id && (
              <RolePermissionEditor
                role={role}
                catalog={catalog}
                onSave={async (permissions) => {
                  setError("");
                  try {
                    await setPermissions(role.id, permissions);
                  } catch (err: any) {
                    setError(err.message || "Nie udało się zapisać uprawnień");
                  }
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RolePermissionEditor({
  role,
  catalog,
  onSave,
}: {
  role: RoleRow;
  catalog: { group: string; permissions: string[] }[];
  onSave: (permissions: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>(role.permissions);
  const dirty =
    selected.length !== role.permissions.length ||
    selected.some((p) => !role.permissions.includes(p));

  const toggle = (permission: string) =>
    setSelected((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission],
    );

  return (
    <div className="mt-4 border-t border-border/60 pt-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {catalog.map((group) => (
          <div key={group.group}>
            <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {group.group}
            </div>
            <ul className="space-y-1">
              {group.permissions.map((permission) => (
                <li key={permission}>
                  <label className="flex items-center gap-2 text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={selected.includes(permission)}
                      onChange={() => toggle(permission)}
                      className="h-3.5 w-3.5 rounded border-border"
                    />
                    <span className="font-mono">{permission}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          disabled={!dirty}
          onClick={() => void onSave(selected)}
          className="rounded-full bg-gradient-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-elegant transition hover:opacity-90 disabled:opacity-40"
        >
          Zapisz uprawnienia
        </button>
        {dirty && (
          <button
            onClick={() => setSelected(role.permissions)}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Cofnij zmiany
          </button>
        )}
      </div>
    </div>
  );
}

// --- Użytkownicy ----------------------------------------------------------

function UserManagementSection() {
  const { usersList, updateUserRole, deleteUser } = useAuth();
  const { roles } = useRolesAdmin(true);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Kolory dla ról systemowych; role dodane przez klienta dostają neutralny
  // wygląd, bo ich nazw nie da się przewidzieć w kodzie.
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-amber-500/20 text-amber-500 border-amber-500/30";
      case "contributor":
        return "bg-primary/20 text-primary border-primary/30";
      case "viewer":
        return "bg-secondary/20 text-secondary-foreground border-secondary/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="rounded-3xl bg-card p-6 shadow-card border border-border/50">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 border-b border-border pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Users className="h-4.5 w-4.5 text-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Użytkownicy</h3>
            <p className="text-xs text-muted-foreground">
              Twórz konta, przypisuj role i usuwaj użytkowników.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddUserOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-elegant hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4" /> Dodaj Użytkownika
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="pb-3 px-3 font-semibold">Użytkownik</th>
              <th className="pb-3 px-3 font-semibold">E-mail</th>
              <th className="pb-3 px-3 font-semibold">Aktualna Rola</th>
              <th className="pb-3 px-3 font-semibold text-right">Zmień Rolę / Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {usersList.map((u: User) => (
              <tr key={u.id} className="hover:bg-muted/40 transition">
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary text-xs font-bold text-primary-foreground">
                      {u.avatarText}
                    </div>
                    <span className="font-bold text-foreground">{u.name}</span>
                  </div>
                </td>
                <td className="py-3.5 px-3 font-mono text-xs text-muted-foreground">{u.email}</td>
                <td className="py-3.5 px-3">
                  <span
                    className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold border ${getRoleBadge(u.role)}`}
                  >
                    {u.roleLabel}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    {/* Lista ról z bazy, a nie cztery wartości zaszyte w kodzie —
                        rola dodana przez klienta jest tu dostępna od razu. */}
                    <select
                      value={u.role}
                      onChange={async (e) => {
                        try {
                          await updateUserRole(u.id, e.target.value);
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      className="rounded-xl bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground border border-border outline-none focus:border-primary"
                    >
                      {roles.map((role) => (
                        <option key={role.code} value={role.code}>
                          {role.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={async () => {
                        if (confirm(`Czy na pewno usunąć użytkownika ${u.name} (${u.email})?`)) {
                          try {
                            await deleteUser(u.id);
                          } catch (err: any) {
                            alert(err.message);
                          }
                        }
                      }}
                      className="p-1.5 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/30 text-xs font-bold"
                      title="Usuń użytkownika"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddUserModal isOpen={isAddUserOpen} onClose={() => setIsAddUserOpen(false)} roles={roles} />
    </div>
  );
}

function AddUserModal({
  isOpen,
  onClose,
  roles,
}: {
  isOpen: boolean;
  onClose: () => void;
  roles: RoleRow[];
}) {
  const { createUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [role, setRole] = useState<UserRole>("contributor");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      await createUser({ name, email, pass, role });
      setName("");
      setEmail("");
      setPass("");
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Błąd dodawania użytkownika");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground font-bold">
              👤
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Dodaj Nowego Użytkownika</h3>
              <p className="text-xs text-muted-foreground">
                Zarejestruj konto i przypisz rolę RBAC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/15 text-destructive text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
              Imię i Nazwisko
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl bg-muted p-3 text-sm font-medium text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Jan Kowalski"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
              Adres E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl bg-muted p-3 text-sm font-medium text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="j.kowalski@optimatic.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
              Hasło
            </label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full rounded-2xl bg-muted p-3 text-sm font-medium text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
              Rola w systemie (RBAC)
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-2xl bg-muted p-3 text-sm font-medium text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {roles.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                  {r.description ? ` — ${r.description}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-full bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elegant hover:opacity-90 transition"
            >
              Zapisz Użytkownika w Bazie
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
