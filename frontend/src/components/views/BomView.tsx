import { useMemo, useState } from "react";
import { Plus, Trash2, PackageMinus, AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useBootstrap } from "@/lib/bootstrap";
import { useOrdersQuery } from "@/hooks/use-orders";
import { useInventoryQuery } from "@/hooks/use-inventory";
import {
  useBomItemsQuery,
  useBomMutations,
  useOrderConsumptionsQuery,
  useOrderRequirementsQuery,
} from "@/hooks/use-bom";
import { Header } from "@/components/shared/Header";

type OrderRow = { id: number; orderNumber: string; productName: string; quantity: number };
type InventoryRow = { id: number; code: string; name: string; unit: string; stock: number };

const emptyRecipeForm = { inventoryItemId: "", quantityPer: "", notes: "" };
const emptyIssueForm = { inventoryItemId: "", batchNumber: "", quantity: "", consumedBy: "" };

function fmt(value: number): string {
  return value.toLocaleString("pl-PL", { maximumFractionDigits: 4 });
}

export function BomView() {
  const { permissions } = useAuth();
  const { moduleFlag } = useBootstrap();
  const canWrite = permissions.canManageBom && moduleFlag("bom", "allowEditRecipe", true);
  const canDelete = permissions.canDeleteBom;

  const { data: orders } = useOrdersQuery();
  const { data: inventory } = useInventoryQuery();
  // useMemo, a nie zwykłe wyrażenie: `products` niżej zależy od tej tablicy,
  // a nowa referencja przy każdym renderze przeliczałaby listę bez potrzeby.
  const orderList: OrderRow[] = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);
  const materials: InventoryRow[] = Array.isArray(inventory) ? inventory : [];

  // Produkty bierzemy ze zleceń, nie z samych receptur — inaczej nie dałoby się
  // założyć receptury dla produktu, który jeszcze żadnej nie ma.
  const products = useMemo(
    () =>
      [...new Set(orderList.map((o) => o.productName))].sort((a, b) => a.localeCompare(b, "pl")),
    [orderList],
  );

  const [product, setProduct] = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const activeProduct = product || products[0] || "";
  const activeOrderId = orderId ?? orderList[0]?.id ?? null;

  const { data: bomItems } = useBomItemsQuery(activeProduct);
  const { data: requirements } = useOrderRequirementsQuery(activeOrderId);
  const { data: consumptions } = useOrderConsumptionsQuery(activeOrderId);
  const { createItemMutation, deleteItemMutation, consumeMutation, deleteConsumptionMutation } =
    useBomMutations();

  const [isRecipeModalOpen, setRecipeModalOpen] = useState(false);
  const [isIssueModalOpen, setIssueModalOpen] = useState(false);
  const [recipeForm, setRecipeForm] = useState(emptyRecipeForm);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [formError, setFormError] = useState("");

  const handleAddRecipeItem = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    createItemMutation.mutate(
      {
        productName: activeProduct,
        inventoryItemId: Number(recipeForm.inventoryItemId),
        quantityPer: Number(recipeForm.quantityPer),
        notes: recipeForm.notes || undefined,
      },
      {
        onSuccess: () => {
          setRecipeModalOpen(false);
          setRecipeForm(emptyRecipeForm);
        },
        onError: (err: any) => setFormError(err.message || "Błąd zapisu pozycji receptury"),
      },
    );
  };

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (activeOrderId === null) return;
    consumeMutation.mutate(
      {
        orderId: activeOrderId,
        inventoryItemId: Number(issueForm.inventoryItemId),
        batchNumber: issueForm.batchNumber,
        quantity: Number(issueForm.quantity),
        consumedBy: issueForm.consumedBy || undefined,
      },
      {
        onSuccess: () => {
          setIssueModalOpen(false);
          setIssueForm(emptyIssueForm);
        },
        onError: (err: any) => setFormError(err.message || "Błąd wydania materiału"),
      },
    );
  };

  return (
    <>
      <Header
        title="Receptury (BOM)"
        subtitle="Normy zużycia materiału na wyrób i faktyczne wydania na zlecenia."
      />

      {/* --- Receptura produktu --- */}
      <section className="rounded-3xl bg-card p-6 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">Receptura produktu</h3>
          <div className="flex items-center gap-2">
            <select
              value={activeProduct}
              onChange={(e) => setProduct(e.target.value)}
              className="rounded-2xl border border-border bg-muted p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {products.length === 0 && <option value="">Brak produktów</option>}
              {products.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {canWrite && activeProduct && (
              <button
                onClick={() => {
                  setFormError("");
                  setRecipeModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Dodaj materiał
              </button>
            )}
          </div>
        </div>

        {!bomItems || bomItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            {activeProduct
              ? `Produkt „${activeProduct}" nie ma jeszcze receptury.`
              : "Brak zleceń, z których można wziąć listę produktów."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Kod</th>
                  <th className="px-4 py-3">Materiał</th>
                  <th className="px-4 py-3">Norma na 1 szt.</th>
                  {canDelete && <th className="px-4 py-3 text-right">Akcje</th>}
                </tr>
              </thead>
              <tbody>
                {bomItems.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{item.code}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {item.name}
                      {item.notes && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {item.notes}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {fmt(Number(item.quantityPer))} {item.unit}
                    </td>
                    {canDelete && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Usunąć ${item.name} z receptury?`)) {
                              deleteItemMutation.mutate(item.id);
                            }
                          }}
                          className="rounded-lg bg-destructive/15 p-1.5 text-destructive hover:bg-destructive/30"
                          title="Usuń z receptury"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* --- Zapotrzebowanie zlecenia: plan kontra fakt --- */}
      <section className="rounded-3xl bg-card p-6 shadow-card">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">Zapotrzebowanie zlecenia</h3>
          <div className="flex items-center gap-2">
            <select
              value={activeOrderId ?? ""}
              onChange={(e) => setOrderId(Number(e.target.value))}
              className="rounded-2xl border border-border bg-muted p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {orderList.length === 0 && <option value="">Brak zleceń</option>}
              {orderList.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} · {o.productName}
                </option>
              ))}
            </select>
            {canWrite && activeOrderId !== null && (
              <button
                onClick={() => {
                  setFormError("");
                  setIssueModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90"
              >
                <PackageMinus className="h-4 w-4" /> Wydaj materiał
              </button>
            )}
          </div>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Norma z receptury przemnożona przez wielkość zlecenia, zestawiona z tym, co faktycznie
          wydano.
        </p>

        {!requirements ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            Wybierz zlecenie.
          </div>
        ) : !requirements.hasBom && requirements.unplanned.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            Produkt „{requirements.productName}" nie ma receptury, a na zlecenie nic jeszcze nie
            wydano.
          </div>
        ) : (
          <div className="space-y-4">
            {requirements.planned.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Materiał</th>
                      <th className="px-4 py-3">Potrzeba</th>
                      <th className="px-4 py-3">Wydano</th>
                      <th className="px-4 py-3">Brakuje</th>
                      <th className="px-4 py-3">Pokrycie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requirements.planned.map((row) => {
                      const pct =
                        row.required > 0 ? Math.min(100, (row.issued / row.required) * 100) : 0;
                      return (
                        <tr key={row.inventoryItemId} className="border-t border-border">
                          <td className="px-4 py-3">
                            <span className="font-medium text-foreground">{row.name}</span>
                            <span className="block font-mono text-xs text-muted-foreground">
                              {row.code}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {fmt(row.required)} {row.unit}
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {fmt(row.issued)} {row.unit}
                            {row.overIssued > 0 && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">
                                <AlertTriangle className="h-3 w-3" /> +{fmt(row.overIssued)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                row.remaining > 0
                                  ? "font-semibold text-destructive"
                                  : "text-success"
                              }
                            >
                              {row.remaining > 0 ? `${fmt(row.remaining)} ${row.unit}` : "pokryte"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full ${
                                  row.remaining > 0 ? "bg-warning" : "bg-success"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {requirements.unplanned.length > 0 && (
              <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-warning-foreground">
                  <AlertTriangle className="h-4 w-4" /> Wydane spoza receptury
                </div>
                <ul className="space-y-1 text-sm text-foreground">
                  {requirements.unplanned.map((row) => (
                    <li key={row.inventoryItemId}>
                      <span className="font-mono text-xs">{row.code}</span> · {row.name} —{" "}
                      {fmt(row.issued)} {row.unit}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* --- Wydania z numerami partii --- */}
      <section className="rounded-3xl bg-card p-6 shadow-card">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Wydania materiału (partie)</h3>
        {!consumptions || consumptions.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            Na to zlecenie nie wydano jeszcze materiału.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Materiał</th>
                  <th className="px-4 py-3">Partia</th>
                  <th className="px-4 py-3">Ilość</th>
                  <th className="px-4 py-3">Wydał</th>
                  <th className="px-4 py-3">Kiedy</th>
                  {canDelete && <th className="px-4 py-3 text-right">Akcje</th>}
                </tr>
              </thead>
              <tbody>
                {consumptions.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{c.name}</span>
                      <span className="block font-mono text-xs text-muted-foreground">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-primary">
                        {c.batchNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {fmt(Number(c.quantity))} {c.unit}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.consumedBy ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(c.consumedAt).toLocaleString("pl-PL", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    {canDelete && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm("Cofnąć wydanie? Materiał wróci na stan magazynowy.")) {
                              deleteConsumptionMutation.mutate(c.id);
                            }
                          }}
                          className="rounded-lg bg-destructive/15 p-1.5 text-destructive hover:bg-destructive/30"
                          title="Cofnij wydanie"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isRecipeModalOpen && (
        <Modal
          title={`Materiał do receptury: ${activeProduct}`}
          onClose={() => setRecipeModalOpen(false)}
        >
          {formError && <FormError message={formError} />}
          <form onSubmit={handleAddRecipeItem} className="space-y-3">
            <Field label="Materiał">
              <select
                value={recipeForm.inventoryItemId}
                onChange={(e) => setRecipeForm({ ...recipeForm, inventoryItemId: e.target.value })}
                className="w-full rounded-2xl border border-border bg-muted p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">— wybierz —</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} · {m.name} ({m.unit})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Norma na 1 sztukę">
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                value={recipeForm.quantityPer}
                onChange={(e) => setRecipeForm({ ...recipeForm, quantityPer: e.target.value })}
                className="w-full rounded-2xl border border-border bg-muted p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </Field>
            <Field label="Uwagi">
              <input
                type="text"
                value={recipeForm.notes}
                onChange={(e) => setRecipeForm({ ...recipeForm, notes: e.target.value })}
                className="w-full rounded-2xl border border-border bg-muted p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <ModalActions
              onCancel={() => setRecipeModalOpen(false)}
              pending={createItemMutation.isPending}
            />
          </form>
        </Modal>
      )}

      {isIssueModalOpen && (
        <Modal title="Wydanie materiału na zlecenie" onClose={() => setIssueModalOpen(false)}>
          {formError && <FormError message={formError} />}
          <form onSubmit={handleIssue} className="space-y-3">
            <Field label="Materiał">
              <select
                value={issueForm.inventoryItemId}
                onChange={(e) => setIssueForm({ ...issueForm, inventoryItemId: e.target.value })}
                className="w-full rounded-2xl border border-border bg-muted p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">— wybierz —</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} · {m.name} (stan: {fmt(Number(m.stock))} {m.unit})
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Numer partii">
                <input
                  type="text"
                  value={issueForm.batchNumber}
                  onChange={(e) => setIssueForm({ ...issueForm, batchNumber: e.target.value })}
                  placeholder="LOT-2026-0345"
                  className="w-full rounded-2xl border border-border bg-muted p-3 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </Field>
              <Field label="Ilość">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={issueForm.quantity}
                  onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })}
                  className="w-full rounded-2xl border border-border bg-muted p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </Field>
            </div>
            <Field label="Wydał">
              <input
                type="text"
                value={issueForm.consumedBy}
                onChange={(e) => setIssueForm({ ...issueForm, consumedBy: e.target.value })}
                placeholder="np. A. Kowalski"
                className="w-full rounded-2xl border border-border bg-muted p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <ModalActions
              onCancel={() => setIssueModalOpen(false)}
              pending={consumeMutation.isPending}
            />
          </form>
        </Modal>
      )}
    </>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md space-y-4 rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full bg-muted p-2 text-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-destructive/15 p-3 text-center text-xs font-semibold text-destructive">
      {message}
    </div>
  );
}

function ModalActions({ onCancel, pending }: { onCancel: () => void; pending: boolean }) {
  return (
    <div className="flex justify-end gap-2 border-t border-border pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full bg-muted px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
      >
        Anuluj
      </button>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Zapisywanie..." : "Zapisz w bazie"}
      </button>
    </div>
  );
}
