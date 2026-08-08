import { useState } from "react";
import {
  Plus,
  Trash2,
  PlugZap,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useConnectionLogsQuery,
  useConnectionsQuery,
  useConnectorsQuery,
  useIntegrationMutations,
} from "@/hooks/use-integrations";
import type { ConnectorDefinition, IntegrationConnection } from "@/lib/api";
import { Header } from "@/components/shared/Header";

const KIND_LABEL: Record<string, string> = {
  erp: "ERP",
  wms: "WMS",
  aodb: "Lotnisko",
  file: "Plik",
};

const CAPABILITY_LABEL: Record<string, string> = {
  pull_orders: "Pobiera zlecenia",
  push_progress: "Raportuje postęp",
  pull_materials: "Pobiera materiały",
};

const STATUS_TONE: Record<string, string> = {
  ok: "bg-success/15 text-success",
  error: "bg-destructive/15 text-destructive",
  unconfigured: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  ok: "Działa",
  error: "Błąd",
  unconfigured: "Nieskonfigurowane",
};

function fmtDate(value: string | null): string {
  if (!value) return "nigdy";
  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function IntegrationsView() {
  const { permissions } = useAuth();
  const canWrite = permissions.canManageIntegrations;
  const canDelete = permissions.canDeleteIntegrations;

  const { data: connectors } = useConnectorsQuery();
  const { data: connections, isLoading } = useConnectionsQuery();
  const { createMutation, updateMutation, deleteMutation, testMutation, syncMutation } =
    useIntegrationMutations();

  const [picked, setPicked] = useState<ConnectorDefinition | null>(null);
  const [editing, setEditing] = useState<IntegrationConnection | null>(null);
  const [logsFor, setLogsFor] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  const { data: logs } = useConnectionLogsQuery(logsFor);
  const list = connections ?? [];
  const catalog = connectors ?? [];
  const editingDefinition = editing ? catalog.find((c) => c.key === editing.connectorKey) : null;

  const openCreate = (connector: ConnectorDefinition) => {
    setPicked(connector);
    setEditing(null);
    setName(connector.name);
    setForm({});
    setFormError("");
  };

  const openEdit = (connection: IntegrationConnection) => {
    const definition = catalog.find((c) => c.key === connection.connectorKey);
    setEditing(connection);
    setPicked(null);
    setName(connection.name);
    setForm(
      Object.fromEntries(
        (definition?.fields ?? [])
          .filter((f) => !f.secret)
          .map((f) => [f.key, String(connection.config[f.key] ?? "")]),
      ),
    );
    setFormError("");
  };

  const closeModal = () => {
    setPicked(null);
    setEditing(null);
    setForm({});
  };

  const activeDefinition = picked ?? editingDefinition ?? null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!activeDefinition) return;

    const config: Record<string, unknown> = {};
    const secrets: Record<string, string> = {};
    for (const field of activeDefinition.fields) {
      const value = form[field.key];
      if (field.secret) {
        // Puste pole sekretu przy edycji znaczy „nie zmieniaj", więc go nie wysyłamy.
        if (value !== undefined && value !== "") secrets[field.key] = value;
      } else if (value !== undefined) {
        config[field.key] = value;
      }
    }

    const onError = (err: any) => setFormError(err.message || "Błąd zapisu połączenia");
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, name, config, secrets },
        { onSuccess: closeModal, onError },
      );
    } else {
      createMutation.mutate(
        { connectorKey: activeDefinition.key, name, config, secrets },
        { onSuccess: closeModal, onError },
      );
    }
  };

  const runTest = (id: number) => {
    setBanner(null);
    testMutation.mutate(id, {
      onSuccess: (result) => setBanner({ ok: result.ok, text: result.message }),
      onError: (err: any) => setBanner({ ok: false, text: err.message }),
    });
  };

  const runSync = (id: number) => {
    setBanner(null);
    syncMutation.mutate(id, {
      onSuccess: (result) => setBanner({ ok: true, text: result.message }),
      onError: (err: any) => setBanner({ ok: false, text: err.message }),
    });
  };

  return (
    <>
      <Header
        title="Integracje"
        subtitle="Połączenia z systemami zewnętrznymi: ERP, WMS, systemy lotniskowe."
      />

      {banner && (
        <div
          className={`rounded-2xl p-4 text-sm font-medium ${
            banner.ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
          }`}
        >
          {banner.text}
        </div>
      )}

      <section className="rounded-3xl bg-card p-6 shadow-card">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Aktywne połączenia</h3>

        {isLoading && <div className="p-6 text-center text-muted-foreground">Ładowanie...</div>}

        {!isLoading && list.length === 0 && (
          <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            Brak skonfigurowanych połączeń. Wybierz system z katalogu poniżej.
          </div>
        )}

        <div className="space-y-3">
          {list.map((connection) => (
            <div key={connection.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{connection.name}</span>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                      {KIND_LABEL[connection.kind] ?? connection.kind}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        STATUS_TONE[connection.status] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABEL[connection.status] ?? connection.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {connection.connectorName} · ostatnia synchronizacja:{" "}
                    {fmtDate(connection.lastSyncAt)}
                  </div>
                  {connection.secretsSet.length > 0 && (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" /> zapisane sekrety:{" "}
                      {connection.secretsSet.join(", ")}
                    </div>
                  )}
                  {connection.lastError && (
                    <div className="mt-2 rounded-xl bg-destructive/10 p-2 text-xs text-destructive">
                      {connection.lastError}
                    </div>
                  )}
                </div>

                {canWrite && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => runTest(connection.id)}
                      disabled={testMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-50"
                    >
                      <PlugZap className="h-3.5 w-3.5" /> Testuj
                    </button>
                    {connection.capabilities.includes("pull_orders") && (
                      <button
                        onClick={() => runSync(connection.id)}
                        disabled={syncMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-elegant hover:opacity-90 disabled:opacity-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {syncMutation.isPending ? "Pobieram..." : "Pobierz zlecenia"}
                      </button>
                    )}
                    <button
                      onClick={() => setLogsFor(logsFor === connection.id ? null : connection.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"
                    >
                      <Clock className="h-3.5 w-3.5" /> Dziennik
                    </button>
                    <button
                      onClick={() => openEdit(connection)}
                      className="rounded-full bg-muted px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"
                    >
                      Konfiguruj
                    </button>
                    <button
                      onClick={() =>
                        updateMutation.mutate({
                          id: connection.id,
                          enabled: !connection.enabled,
                        })
                      }
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${
                        connection.enabled
                          ? "bg-success/15 text-success hover:bg-success/30"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {connection.enabled ? "Włączone" : "Wyłączone"}
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => {
                          if (confirm(`Usunąć połączenie „${connection.name}"?`)) {
                            deleteMutation.mutate(connection.id);
                          }
                        }}
                        className="rounded-lg bg-destructive/15 p-2 text-destructive hover:bg-destructive/30"
                        title="Usuń"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {logsFor === connection.id && (
                <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/60 text-left uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2">Kiedy</th>
                        <th className="px-3 py-2">Operacja</th>
                        <th className="px-3 py-2">Wynik</th>
                        <th className="px-3 py-2">Rekordy</th>
                        <th className="px-3 py-2">Komunikat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(logs ?? []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                            Brak wpisów.
                          </td>
                        </tr>
                      )}
                      {(logs ?? []).map((log) => (
                        <tr key={log.id} className="border-t border-border">
                          <td className="px-3 py-2 text-muted-foreground">
                            {fmtDate(log.startedAt)}
                          </td>
                          <td className="px-3 py-2 font-mono">{log.operation}</td>
                          <td className="px-3 py-2">
                            {log.status === "success" ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {log.recordsRead} / {log.recordsWritten}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{log.message ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-card">
        <h3 className="mb-1 text-lg font-semibold text-foreground">Katalog systemów</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Lista jest filtrowana pod branżę tego klienta. Konektory oznaczone jako „w przygotowaniu"
          nie mają jeszcze sterownika — da się je opisać, ale nie podłączyć.
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {catalog.map((connector) => {
            const isPlanned = connector.status === "planned";
            return (
              <div
                key={connector.key}
                className={`rounded-2xl border p-4 ${
                  isPlanned ? "border-dashed border-border opacity-70" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{connector.name}</span>
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                        {KIND_LABEL[connector.kind] ?? connector.kind}
                      </span>
                      {isPlanned && (
                        <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">
                          w przygotowaniu
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{connector.vendor}</div>
                  </div>
                  {canWrite && !isPlanned && (
                    <button
                      onClick={() => openCreate(connector)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-elegant hover:opacity-90"
                    >
                      <Plus className="h-3.5 w-3.5" /> Podłącz
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-foreground">{connector.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {connector.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {CAPABILITY_LABEL[cap] ?? cap}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {activeDefinition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">
                {editing ? "Konfiguracja połączenia" : `Podłącz: ${activeDefinition.name}`}
              </h3>
              <button
                onClick={closeModal}
                className="rounded-full bg-muted p-2 text-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl bg-destructive/15 p-3 text-center text-xs font-semibold text-destructive">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                  Nazwa połączenia
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-muted p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              {activeDefinition.fields.map((field) => {
                const alreadySet = editing?.secretsSet.includes(field.key) ?? false;
                return (
                  <div key={field.key}>
                    <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                      {field.label}
                      {field.secret && alreadySet && (
                        <span className="ml-2 font-normal normal-case text-success">
                          zapisane — zostaw puste, aby nie zmieniać
                        </span>
                      )}
                    </label>
                    {field.type === "select" ? (
                      <select
                        value={form[field.key] ?? ""}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        className="w-full rounded-2xl border border-border bg-muted p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        required={field.required}
                      >
                        <option value="">— wybierz —</option>
                        {(field.options ?? []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === "password" ? "password" : "text"}
                        value={form[field.key] ?? ""}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        autoComplete={field.secret ? "new-password" : "off"}
                        className="w-full rounded-2xl border border-border bg-muted p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        required={field.required && !alreadySet}
                      />
                    )}
                    {field.help && (
                      <p className="mt-1 text-[11px] text-muted-foreground">{field.help}</p>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full bg-muted px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Zapisywanie..."
                    : "Zapisz"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
