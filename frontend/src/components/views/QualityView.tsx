import { useState } from "react";
import { Plus, Trash2, CheckCircle2, XCircle, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useBootstrap } from "@/lib/bootstrap";
import { useOrdersQuery } from "@/hooks/use-orders";
import {
  useQualityDefectsQuery,
  useQualityMutations,
  useQualityParetoQuery,
} from "@/hooks/use-quality";
import type { QualityDefect } from "@/lib/api";
import { Header } from "@/components/shared/Header";
import { KpiCard } from "@/components/shared/KpiCard";

const DEFECT_LABELS: Record<string, string> = {
  dimension: "Wymiar poza tolerancją",
  surface: "Wada powierzchni",
  material: "Wada materiału",
  assembly: "Błąd montażu",
  contamination: "Zanieczyszczenie",
  labeling: "Błąd oznaczenia",
  other: "Inne",
};

const STATUS_LABEL: Record<QualityDefect["status"], string> = {
  open: "Do poprawki",
  reworked: "Poprawiona",
  scrapped: "Złom",
};

const STATUS_TONE: Record<QualityDefect["status"], string> = {
  open: "bg-warning/20 text-warning-foreground",
  reworked: "bg-success/15 text-success",
  scrapped: "bg-destructive/15 text-destructive",
};

const emptyForm = {
  orderId: "",
  defectCode: "surface",
  quantity: "1",
  disposition: "scrap" as QualityDefect["disposition"],
  machineId: "",
  detectedBy: "",
  notes: "",
};

export function QualityView() {
  const { permissions } = useAuth();
  const { moduleFlag } = useBootstrap();
  const canManage = permissions.canManageQuality;
  const canDelete =
    permissions.canDeleteQuality && moduleFlag("quality", "allowDeleteDefect", true);
  const allowRework = moduleFlag("quality", "allowRework", true);

  const { data: defects, isLoading, error } = useQualityDefectsQuery();
  const { data: pareto } = useQualityParetoQuery(30);
  const { data: orders } = useOrdersQuery();
  const { createMutation, resolveMutation, deleteMutation } = useQualityMutations();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const list: QualityDefect[] = Array.isArray(defects) ? defects : [];
  const orderList: { id: number; orderNumber: string; productName: string }[] = Array.isArray(
    orders,
  )
    ? orders
    : [];
  const orderNumberById = new Map(orderList.map((o) => [o.id, o.orderNumber]));

  const topCause = pareto?.causes[0];

  const openCreateModal = () => {
    setForm({ ...emptyForm, orderId: orderList[0] ? String(orderList[0].id) : "" });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    createMutation.mutate(
      {
        orderId: Number(form.orderId),
        defectCode: form.defectCode,
        quantity: Number(form.quantity),
        disposition: form.disposition,
        machineId: form.machineId || undefined,
        detectedBy: form.detectedBy || undefined,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => setIsModalOpen(false),
        onError: (err: any) => setFormError(err.message || "Błąd zapisu karty wady"),
      },
    );
  };

  return (
    <>
      <Header
        title="Jakość"
        subtitle="Karty wad, braki i poprawki. Zarejestrowane braki zasilają wskaźnik jakości w OEE."
        action={
          canManage ? (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" /> Zgłoś wadę
            </button>
          ) : undefined
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Braki (30 dni)"
          value={(pareto?.scrapQuantity ?? 0).toLocaleString("pl-PL")}
          delta="Live"
          note="sztuk na złom"
          warn
        />
        <KpiCard
          label="Poprawione"
          value={(pareto?.reworkedQuantity ?? 0).toLocaleString("pl-PL")}
          delta="Live"
          note="uratowane sztuki"
        />
        <KpiCard
          label="Otwarte poprawki"
          value={(pareto?.openQuantity ?? 0).toLocaleString("pl-PL")}
          delta="Live"
          note="czeka na decyzję"
          highlight
        />
        <KpiCard
          label="Główna przyczyna"
          value={topCause ? `${topCause.pct}%` : "—"}
          delta="Pareto"
          note={topCause?.label ?? "brak danych"}
        />
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-card">
        <h3 className="mb-1 text-lg font-semibold text-foreground">Pareto przyczyn wad</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Ostatnie 30 dni. Skumulowany procent pokazuje, ile przyczyn odpowiada za większość braków.
        </p>
        {!pareto || pareto.causes.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            Brak zarejestrowanych braków w tym okresie.
          </div>
        ) : (
          <div className="space-y-3">
            {pareto.causes.map((cause) => (
              <div key={cause.code}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{cause.label}</span>
                  <span className="text-muted-foreground">
                    {cause.quantity.toLocaleString("pl-PL")} szt. ·{" "}
                    <span className="font-semibold text-foreground">{cause.pct}%</span>
                    <span className="ml-2 text-xs">skum. {cause.cumulativePct}%</span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-primary"
                    style={{ width: `${cause.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-card">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Karty wad</h3>

        {isLoading && <div className="p-6 text-center text-muted-foreground">Ładowanie...</div>}
        {error && (
          <div className="p-6 text-center font-medium text-destructive">
            Błąd pobierania kart wad!
          </div>
        )}
        {!isLoading && list.length === 0 && (
          <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            Brak zarejestrowanych wad.
          </div>
        )}

        {list.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Zlecenie</th>
                  <th className="px-4 py-3">Wada</th>
                  <th className="px-4 py-3">Ilość</th>
                  <th className="px-4 py-3">Maszyna</th>
                  <th className="px-4 py-3">Wykrył</th>
                  <th className="px-4 py-3">Status</th>
                  {(canManage || canDelete) && <th className="px-4 py-3 text-right">Akcje</th>}
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      {orderNumberById.get(d.orderId) ?? `#${d.orderId}`}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {DEFECT_LABELS[d.defectCode] ?? d.defectCode}
                      {d.notes && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {d.notes}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground">{d.quantity}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.machineId ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.detectedBy ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONE[d.status]}`}
                      >
                        {STATUS_LABEL[d.status]}
                      </span>
                    </td>
                    {(canManage || canDelete) && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Rozstrzygnąć da się tylko poprawkę, która jeszcze czeka. */}
                          {canManage && allowRework && d.status === "open" && (
                            <>
                              <button
                                onClick={() =>
                                  resolveMutation.mutate({ id: d.id, outcome: "reworked" })
                                }
                                className="rounded-lg bg-success/15 p-1.5 text-success hover:bg-success/30"
                                title="Poprawka udana — sztuka uratowana"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  resolveMutation.mutate({ id: d.id, outcome: "scrapped" })
                                }
                                className="rounded-lg bg-destructive/15 p-1.5 text-destructive hover:bg-destructive/30"
                                title="Poprawka nieudana — na złom"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                if (confirm("Czy na pewno usunąć tę kartę wady?")) {
                                  deleteMutation.mutate(d.id);
                                }
                              }}
                              className="rounded-lg bg-destructive/15 p-1.5 text-destructive hover:bg-destructive/30"
                              title="Usuń"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md space-y-4 rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Nowa karta wady</h3>
              <button
                onClick={() => setIsModalOpen(false)}
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

            {orderList.length === 0 && (
              <div className="rounded-xl bg-warning/20 p-3 text-center text-xs font-semibold text-warning-foreground">
                Brak zleceń w bazie — wadę trzeba przypiąć do zlecenia.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                  Zlecenie
                </label>
                <select
                  value={form.orderId}
                  onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                  className="w-full rounded-2xl border border-border bg-muted p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">— wybierz —</option>
                  {orderList.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} · {o.productName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                    Typ wady
                  </label>
                  <select
                    value={form.defectCode}
                    onChange={(e) => setForm({ ...form, defectCode: e.target.value })}
                    className="w-full rounded-2xl border border-border bg-muted p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(DEFECT_LABELS).map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                    Ilość (szt.)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full rounded-2xl border border-border bg-muted p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                  Decyzja
                </label>
                <select
                  value={form.disposition}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      disposition: e.target.value as QualityDefect["disposition"],
                    })
                  }
                  className="w-full rounded-2xl border border-border bg-muted p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="scrap">Złom — brak nie do uratowania</option>
                  {allowRework && <option value="rework">Poprawka — do naprawy</option>}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                    Maszyna
                  </label>
                  <input
                    type="text"
                    value={form.machineId}
                    onChange={(e) => setForm({ ...form, machineId: e.target.value })}
                    placeholder="np. PRESS-01"
                    className="w-full rounded-2xl border border-border bg-muted p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                    Wykrył
                  </label>
                  <input
                    type="text"
                    value={form.detectedBy}
                    onChange={(e) => setForm({ ...form, detectedBy: e.target.value })}
                    placeholder="np. A. Kowalski"
                    className="w-full rounded-2xl border border-border bg-muted p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
                  Opis
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="np. rysa na powierzchni czołowej"
                  className="w-full rounded-2xl border border-border bg-muted p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full bg-muted px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || orderList.length === 0}
                  className="rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90 disabled:opacity-50"
                >
                  {createMutation.isPending ? "Zapisywanie..." : "Zapisz w bazie"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
