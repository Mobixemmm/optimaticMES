import { useState } from "react";
import { Plus, Calendar, Trash2, CheckCircle2, PlayCircle, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMaintenanceMutations, useMaintenanceQuery } from "@/hooks/use-maintenance";
import { Header } from "@/components/shared/Header";
import { KpiCard } from "@/components/shared/KpiCard";

type MaintenanceTask = {
  id: number;
  taskNumber: string;
  asset: string;
  type: string;
  dueDate: string;
  technician: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "open" | "in_progress" | "done";
};

const emptyForm = {
  taskNumber: "",
  asset: "",
  type: "",
  dueDate: "",
  technician: "",
  priority: "medium" as MaintenanceTask["priority"],
};

const PRIORITY_LABEL: Record<MaintenanceTask["priority"], string> = {
  critical: "Krytyczny",
  high: "Wysoki",
  medium: "Średni",
  low: "Niski",
};
const PRIORITY_TONE: Record<MaintenanceTask["priority"], string> = {
  critical: "bg-destructive/15 text-destructive",
  high: "bg-warning/20 text-warning-foreground",
  medium: "bg-primary/10 text-primary",
  low: "bg-success/15 text-success",
};

function formatDue(dueDate: string): string {
  const due = new Date(dueDate);
  const today = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((dueDay.getTime() - todayDay.getTime()) / 86400000);
  if (diffDays === 0) return "Dziś";
  if (diffDays === 1) return "Jutro";
  return due.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
}

export function MaintenanceView() {
  const { permissions } = useAuth();
  const canManage = permissions.canManageMaintenance;
  const canDelete = permissions.canDeleteMaintenance;

  const { data: tasks, isLoading, error } = useMaintenanceQuery();
  const { createMutation, updateMutation, deleteMutation } = useMaintenanceMutations();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const list: MaintenanceTask[] = Array.isArray(tasks) ? tasks : [];
  const openCount = list.filter((t) => t.status !== "done").length;
  const criticalCount = list.filter((t) => t.status !== "done" && t.priority === "critical").length;
  const inProgressCount = list.filter((t) => t.status === "in_progress").length;
  const doneCount = list.filter((t) => t.status === "done").length;

  const openCreateModal = () => {
    setForm(emptyForm);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    createMutation.mutate(
      {
        taskNumber: form.taskNumber,
        asset: form.asset,
        type: form.type,
        dueDate: new Date(form.dueDate).toISOString(),
        technician: form.technician,
        priority: form.priority,
      },
      {
        onSuccess: () => setIsModalOpen(false),
        onError: (err: any) => setFormError(err.message || "Błąd zapisu zgłoszenia"),
      },
    );
  };

  return (
    <>
      <Header
        title="Utrzymanie ruchu"
        subtitle="Harmonogram i zlecenia serwisowe."
        action={
          canManage ? (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" /> Nowe zgłoszenie
            </button>
          ) : undefined
        }
      />
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Otwarte zgłoszenia"
          value={openCount.toString()}
          delta="Live"
          note="w tym krytyczne"
          highlight
        />
        <KpiCard
          label="Krytyczne"
          value={criticalCount.toString()}
          delta="Live"
          note="wymaga uwagi"
          warn
        />
        <KpiCard
          label="W trakcie"
          value={inProgressCount.toString()}
          delta="Live"
          note="realizowane"
        />
        <KpiCard label="Zakończone" value={doneCount.toString()} delta="Live" note="zamknięte" />
      </section>
      <section className="rounded-3xl bg-card p-6 shadow-card">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Zlecenia serwisowe</h3>

        {isLoading && <div className="p-6 text-center text-muted-foreground">Ładowanie...</div>}
        {error && (
          <div className="p-6 text-center text-destructive font-medium">
            Błąd pobierania zgłoszeń!
          </div>
        )}
        {!isLoading && list.length === 0 && (
          <div className="p-8 text-center text-muted-foreground border border-dashed rounded-2xl">
            Brak zgłoszeń serwisowych w bazie danych.
          </div>
        )}

        {list.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Nr</th>
                  <th className="px-4 py-3">Zasób</th>
                  <th className="px-4 py-3">Typ</th>
                  <th className="px-4 py-3">Termin</th>
                  <th className="px-4 py-3">Technik</th>
                  <th className="px-4 py-3">Priorytet</th>
                  <th className="px-4 py-3">Status</th>
                  {(canManage || canDelete) && <th className="px-4 py-3 text-right">Akcje</th>}
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{t.taskNumber}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{t.asset}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.type}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <Calendar className="h-3 w-3" /> {formatDue(t.dueDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{t.technician}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${PRIORITY_TONE[t.priority]}`}
                      >
                        {PRIORITY_LABEL[t.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold bg-muted text-muted-foreground">
                        {t.status === "open"
                          ? "Otwarte"
                          : t.status === "in_progress"
                            ? "W trakcie"
                            : "Zakończone"}
                      </span>
                    </td>
                    {(canManage || canDelete) && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {canManage && t.status !== "in_progress" && t.status !== "done" && (
                            <button
                              onClick={() =>
                                updateMutation.mutate({ id: t.id, status: "in_progress" })
                              }
                              className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                              title="Rozpocznij"
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canManage && t.status !== "done" && (
                            <button
                              onClick={() => updateMutation.mutate({ id: t.id, status: "done" })}
                              className="p-1.5 rounded-lg bg-success/15 text-success hover:bg-success/30"
                              title="Oznacz jako zakończone"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                if (confirm(`Czy na pewno usunąć zgłoszenie ${t.taskNumber}?`)) {
                                  deleteMutation.mutate(t.id);
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Nowe zgłoszenie serwisowe</h3>
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
                    Numer
                  </label>
                  <input
                    type="text"
                    value={form.taskNumber}
                    onChange={(e) => setForm({ ...form, taskNumber: e.target.value })}
                    placeholder="MT-105"
                    className="w-full rounded-2xl bg-muted p-3 text-sm font-mono text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Termin
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Zasób (maszyna)
                </label>
                <input
                  type="text"
                  value={form.asset}
                  onChange={(e) => setForm({ ...form, asset: e.target.value })}
                  placeholder="np. Robot RB-07"
                  className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Typ zgłoszenia
                </label>
                <input
                  type="text"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  placeholder="np. Naprawa awaryjna"
                  className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Technik
                  </label>
                  <input
                    type="text"
                    value={form.technician}
                    onChange={(e) => setForm({ ...form, technician: e.target.value })}
                    className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Priorytet
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value as MaintenanceTask["priority"] })
                    }
                    className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="critical">Krytyczny</option>
                    <option value="high">Wysoki</option>
                    <option value="medium">Średni</option>
                    <option value="low">Niski</option>
                  </select>
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
                  disabled={createMutation.isPending}
                  className="rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90"
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
