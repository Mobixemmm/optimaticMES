import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useInventoryMutations, useInventoryQuery } from "@/hooks/use-inventory";
import { Header } from "@/components/shared/Header";
import { KpiCard } from "@/components/shared/KpiCard";

type InventoryItem = {
  id: number;
  code: string;
  name: string;
  stock: number;
  unit: string;
  minStock: number;
  category: string | null;
};

const emptyForm = { code: "", name: "", stock: "", unit: "szt.", minStock: "", category: "" };

function toneOf(item: InventoryItem): "ok" | "warn" | "err" {
  const stock = Number(item.stock);
  const min = Number(item.minStock);
  if (stock < min * 0.5) return "err";
  if (stock < min) return "warn";
  return "ok";
}

export function InventoryView() {
  const { permissions } = useAuth();
  const canManage = permissions.canManageInventory;
  const canDelete = permissions.canDeleteInventory;

  const { data: inventory, isLoading, error } = useInventoryQuery();
  const { createMutation, updateMutation, deleteMutation } = useInventoryMutations();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const badge: Record<string, string> = {
    ok: "bg-success/15 text-success",
    warn: "bg-warning/20 text-warning-foreground",
    err: "bg-destructive/15 text-destructive",
  };
  const label: Record<string, string> = { ok: "OK", warn: "Niski", err: "Krytyczny" };

  const list: InventoryItem[] = Array.isArray(inventory) ? inventory : [];
  const lowCount = list.filter((r) => toneOf(r) !== "ok").length;

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      code: item.code,
      name: item.name,
      stock: String(item.stock),
      unit: item.unit,
      minStock: String(item.minStock),
      category: item.category || "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const payload = {
      code: form.code,
      name: form.name,
      stock: Number(form.stock) || 0,
      unit: form.unit,
      minStock: Number(form.minStock) || 0,
      category: form.category || undefined,
    };
    const onSuccess = () => setIsModalOpen(false);
    const onError = (err: any) => setFormError(err.message || "Błąd zapisu pozycji");

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload }, { onSuccess, onError });
    } else {
      createMutation.mutate(payload, { onSuccess, onError });
    }
  };

  return (
    <>
      <Header
        title="Magazyn"
        subtitle="Stany materiałów i komponentów produkcyjnych."
        action={
          canManage ? (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" /> Dodaj pozycję
            </button>
          ) : undefined
        }
      />
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Pozycji"
          value={list.length.toString()}
          delta="Live"
          note="w katalogu"
          highlight
        />
        <KpiCard
          label="Niski stan"
          value={lowCount.toString()}
          delta="Live"
          note="poniżej min."
          warn
        />
      </section>
      <section className="rounded-3xl bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Stany magazynowe</h3>
          <span className="text-xs text-muted-foreground">Synchronizacja z bazą danych</span>
        </div>

        {isLoading && <div className="p-6 text-center text-muted-foreground">Ładowanie...</div>}
        {error && (
          <div className="p-6 text-center text-destructive font-medium">
            Błąd pobierania magazynu!
          </div>
        )}

        {!isLoading && list.length === 0 && (
          <div className="p-8 text-center text-muted-foreground border border-dashed rounded-2xl">
            Brak pozycji magazynowych w bazie danych.
          </div>
        )}

        {list.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Kod</th>
                  <th className="px-4 py-3">Nazwa</th>
                  <th className="px-4 py-3">Stan</th>
                  <th className="px-4 py-3">Minimum</th>
                  <th className="px-4 py-3">Status</th>
                  {(canManage || canDelete) && <th className="px-4 py-3 text-right">Akcje</th>}
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const tone = toneOf(r);
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{r.code}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                      <td className="px-4 py-3 text-foreground">
                        {r.stock} {r.unit}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.minStock} {r.unit}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge[tone]}`}
                        >
                          {label[tone]}
                        </span>
                      </td>
                      {(canManage || canDelete) && (
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {canManage && (
                              <button
                                onClick={() => openEditModal(r)}
                                className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                                title="Edytuj"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => {
                                  if (confirm(`Czy na pewno usunąć pozycję ${r.code}?`)) {
                                    deleteMutation.mutate(r.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/30"
                                title="Usuń"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">
                {editingId ? "Edytuj pozycję" : "Dodaj pozycję magazynową"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full bg-muted p-2 text-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-destructive/15 text-destructive text-xs font-semibold text-center">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Kod
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full rounded-2xl bg-muted p-3 text-sm font-mono text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    disabled={!!editingId}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Jednostka
                  </label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Nazwa
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Stan
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Minimum
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                    className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full bg-muted px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Zapisywanie..."
                    : "Zapisz w bazie"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
