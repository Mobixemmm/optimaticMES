import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useOperatorMutations, useOperatorsQuery } from "@/hooks/use-operators";
import { Header } from "@/components/shared/Header";
import { KpiCard } from "@/components/shared/KpiCard";

type Operator = {
  id: number;
  firstName: string;
  lastName: string;
  rfidCardId: string;
  pinCode?: string | null;
  role: string;
  station: string | null;
  shift: string;
  efficiencyPct: number | null;
  isActive: boolean;
};

const emptyForm = {
  firstName: "",
  lastName: "",
  rfidCardId: "",
  pinCode: "",
  role: "Operator",
  station: "",
  shift: "I",
  efficiencyPct: "",
};

export function OperatorsView() {
  const { permissions } = useAuth();
  const canManage = permissions.canManageOperators;

  const { data: operators, isLoading, error } = useOperatorsQuery();
  const { createMutation, updateMutation, deleteMutation } = useOperatorMutations();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const list: Operator[] = Array.isArray(operators) ? operators : [];
  const activeCount = list.filter((o) => o.isActive).length;
  const inactiveCount = list.length - activeCount;
  const withEff = list.filter((o) => o.efficiencyPct != null);
  const avgEff =
    withEff.length > 0
      ? Math.round(withEff.reduce((s, o) => s + Number(o.efficiencyPct), 0) / withEff.length)
      : 0;

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (op: Operator) => {
    setEditingId(op.id);
    setForm({
      firstName: op.firstName,
      lastName: op.lastName,
      rfidCardId: op.rfidCardId,
      pinCode: op.pinCode || "",
      role: op.role,
      station: op.station || "",
      shift: op.shift,
      efficiencyPct: op.efficiencyPct != null ? String(op.efficiencyPct) : "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      rfidCardId: form.rfidCardId,
      pinCode: form.pinCode || undefined,
      role: form.role || undefined,
      station: form.station || undefined,
      shift: form.shift || undefined,
      efficiencyPct: form.efficiencyPct ? Number(form.efficiencyPct) : undefined,
    };

    const onSuccess = () => setIsModalOpen(false);
    const onError = (err: any) => setFormError(err.message || "Błąd zapisu operatora");

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload }, { onSuccess, onError });
    } else {
      createMutation.mutate(payload, { onSuccess, onError });
    }
  };

  return (
    <>
      <Header
        title="Operatorzy"
        subtitle="Obsada zmiany i efektywność pracy."
        action={
          canManage ? (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" /> Dodaj operatora
            </button>
          ) : undefined
        }
      />
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Na zmianie"
          value={activeCount.toString()}
          delta="Live"
          note="obecnych"
          highlight
        />
        <KpiCard
          label="Nieobecni"
          value={inactiveCount.toString()}
          delta="Live"
          note="nieaktywni"
          warn
        />
        <KpiCard label="Śr. efektywność" value={`${avgEff}%`} delta="Live" note="z bazy danych" />
        <KpiCard
          label="Wszyscy operatorzy"
          value={list.length.toString()}
          delta="Live"
          note="w kartotece"
        />
      </section>

      {isLoading && <div className="p-6 text-foreground font-medium">Ładowanie operatorów...</div>}
      {error && (
        <div className="p-6 text-center text-destructive font-medium">
          Błąd pobierania operatorów!
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {list.map((o) => {
          const initials = `${o.firstName[0] ?? ""}${o.lastName[0] ?? ""}`.toUpperCase();
          return (
            <div key={o.id} className="rounded-3xl bg-card p-5 shadow-card border border-border/50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-sm font-bold text-primary-foreground shadow-elegant">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {o.firstName} {o.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">{o.role}</div>
                  </div>
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openEditModal(o)}
                      className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                      title="Edytuj"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(`Czy na pewno usunąć operatora ${o.firstName} ${o.lastName}?`)
                        ) {
                          deleteMutation.mutate(o.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/30"
                      title="Usuń"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stanowisko</span>
                  <span className="font-semibold text-foreground">{o.station || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zmiana</span>
                  <span className="font-semibold text-foreground">{o.shift}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span
                    className={`font-semibold ${o.isActive ? "text-success" : "text-muted-foreground"}`}
                  >
                    {o.isActive ? "Aktywny" : "Nieaktywny"}
                  </span>
                </div>
              </div>
              {o.efficiencyPct != null && (
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Efektywność</span>
                    <span className="font-semibold text-foreground">{o.efficiencyPct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-primary"
                      style={{ width: `${o.efficiencyPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!isLoading && list.length === 0 && (
          <div className="col-span-full p-8 text-center text-muted-foreground border border-dashed rounded-2xl">
            Brak operatorów w bazie danych.
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">
                {editingId ? "Edytuj operatora" : "Dodaj operatora"}
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
                    Imię
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Nazwisko
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Karta RFID
                </label>
                <input
                  type="text"
                  value={form.rfidCardId}
                  onChange={(e) => setForm({ ...form, rfidCardId: e.target.value })}
                  className="w-full rounded-2xl bg-muted p-3 text-sm font-mono text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={!!editingId}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Rola
                </label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="np. Operator CNC"
                  className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Stanowisko
                  </label>
                  <input
                    type="text"
                    value={form.station}
                    onChange={(e) => setForm({ ...form, station: e.target.value })}
                    placeholder="np. CNC-01"
                    className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Zmiana
                  </label>
                  <select
                    value={form.shift}
                    onChange={(e) => setForm({ ...form, shift: e.target.value })}
                    className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="I">I</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Efektywność (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.efficiencyPct}
                  onChange={(e) => setForm({ ...form, efficiencyPct: e.target.value })}
                  className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
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
