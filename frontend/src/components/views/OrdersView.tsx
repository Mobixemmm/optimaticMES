import { useState } from "react";
import { Plus, Play, CheckCircle2, X } from "lucide-react";
import { useBootstrap } from "@/lib/bootstrap";
import { useAuth } from "@/lib/auth";
import { useOrdersQuery, useOrderMutations } from "@/hooks/use-orders";
import { Header } from "@/components/shared/Header";
import { KpiCard } from "@/components/shared/KpiCard";

export function OrdersView() {
  const { moduleFlag } = useBootstrap();
  const { permissions } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    orderNumber: `WO-${Math.floor(1000 + Math.random() * 9000)}`,
    productName: "",
    quantity: 100,
  });

  // Dwa niezależne warunki: czy klient w ogóle dopuszcza tę operację
  // (konfiguracja modułu) i czy ten użytkownik ma do niej prawo (rola).
  const canCreate = moduleFlag("orders", "allowCreate") && permissions.canCreateOrder;
  const canUpdateStatus =
    moduleFlag("orders", "allowStatusChange") && permissions.canChangeOrderStatus;
  const canDelete = moduleFlag("orders", "allowDelete") && permissions.canDeleteOrder;

  // 1. READ: Pobieranie zleceń z bazy
  const { data: orders, isLoading, error } = useOrdersQuery();

  // 2-4. CREATE / UPDATE / DELETE
  const { createMutation, statusMutation, deleteMutation } = useOrderMutations();

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.productName || !newOrder.orderNumber) return;
    createMutation.mutate(
      {
        orderNumber: newOrder.orderNumber,
        productName: newOrder.productName,
        quantity: Number(newOrder.quantity) || 1,
      },
      {
        onSuccess: () => {
          setIsAddModalOpen(false);
          setNewOrder({
            orderNumber: `WO-${Math.floor(1000 + Math.random() * 9000)}`,
            productName: "",
            quantity: 100,
          });
        },
        onError: (err: any) => {
          alert(`Błąd tworzenia zlecenia: ${err.message}`);
        },
      },
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
      case "ZAKONCZONE":
        return "bg-success/15 text-success";
      case "in_progress":
      case "W TOKU":
        return "bg-primary/15 text-primary";
      case "paused":
      case "WSTRZYMANE":
        return "bg-warning/20 text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <>
      <Header
        title="Zlecenia produkcyjne (CRUD)"
        subtitle="Zarządzaj zleceniami w bazie danych: dodawaj, zmieniaj statusy i usuwaj."
        action={
          canCreate ? (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" /> Nowe zlecenie
            </button>
          ) : undefined
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Wszystkie Zlecenia"
          value={orders?.length?.toString() || "0"}
          delta="Live"
          note="z bazy danych"
          highlight
        />
        <KpiCard
          label="W toku"
          value={
            orders
              ?.filter((o: any) => o.status === "in_progress" || o.status === "W TOKU")
              .length.toString() || "0"
          }
          delta="Aktualne"
          note="na hali"
        />
        <KpiCard
          label="Zakończone"
          value={
            orders
              ?.filter((o: any) => o.status === "completed" || o.status === "ZAKONCZONE")
              .length.toString() || "0"
          }
          delta="Gotowe"
          note="zrealizowane"
        />
        <KpiCard
          label="Zaplanowane"
          value={
            orders
              ?.filter((o: any) => !o.status || o.status === "pending" || o.status === "planned")
              .length.toString() || "0"
          }
          delta="Kolejka"
          note="do rozpoczęcia"
        />
      </section>

      {/* Tabela Zleceń z Bazy Danych */}
      <div className="rounded-3xl bg-card p-6 shadow-card border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-foreground">Lista Zleceń Produkcyjnych</h3>
          <span className="text-xs text-muted-foreground">
            Automatyczna synchronizacja z backendem
          </span>
        </div>

        {isLoading && (
          <div className="p-6 text-center text-muted-foreground font-medium">
            Ładowanie zleceń...
          </div>
        )}
        {error && (
          <div className="p-6 text-center text-destructive font-medium">
            Błąd pobierania zleceń!
          </div>
        )}

        {!isLoading && orders?.length === 0 && (
          <div className="p-8 text-center text-muted-foreground border border-dashed rounded-2xl">
            Brak zleceń w bazie danych.{" "}
            {canCreate && "Kliknij + Nowe zlecenie, aby dodać pierwsze!"}
          </div>
        )}

        {orders && orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 px-3 font-semibold">Numer</th>
                  <th className="pb-3 px-3 font-semibold">Produkt</th>
                  <th className="pb-3 px-3 font-semibold">Postęp</th>
                  <th className="pb-3 px-3 font-semibold">Status</th>
                  {(canUpdateStatus || canDelete) && (
                    <th className="pb-3 px-3 font-semibold text-right">Akcje (CRUD)</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {orders.map((order: any) => {
                  const done = order.producedQuantity || 0;
                  const planned = order.quantity || order.plannedQuantity || 1;
                  const pct = Math.min(100, Math.round((done / planned) * 100));

                  return (
                    <tr key={order.id} className="hover:bg-muted/40 transition">
                      <td className="py-3.5 px-3 font-mono font-bold text-foreground">
                        {order.orderNumber}
                      </td>
                      <td className="py-3.5 px-3 font-medium text-foreground">
                        {order.productName}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-gradient-primary rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {done} / {planned}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusBadge(order.status)}`}
                        >
                          {order.status || "pending"}
                        </span>
                      </td>
                      {(canUpdateStatus || canDelete) && (
                        <td className="py-3.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Przycisk Start / W toku (Update) */}
                            {canUpdateStatus && (
                              <>
                                <button
                                  onClick={() =>
                                    statusMutation.mutate({ id: order.id, status: "in_progress" })
                                  }
                                  className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold"
                                  title="Rozpocznij"
                                >
                                  <Play className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    statusMutation.mutate({ id: order.id, status: "completed" })
                                  }
                                  className="p-1.5 rounded-lg bg-success/15 text-success hover:bg-success/30 text-xs font-semibold"
                                  title="Oznacz jako Zakończone"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            {/* Przycisk Usuń (Delete) */}
                            {canDelete && (
                              <button
                                onClick={() => {
                                  if (
                                    confirm(`Czy na pewno usunąć zlecenie ${order.orderNumber}?`)
                                  ) {
                                    deleteMutation.mutate(order.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/30 text-xs font-semibold"
                                title="Usuń z bazy"
                              >
                                <X className="h-4 w-4" />
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
      </div>

      {/* Modal tworzenia zlecenia */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Dodaj Nowe Zlecenie (CREATE)</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-full bg-muted p-2 text-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Numer Zlecenia
                </label>
                <input
                  type="text"
                  value={newOrder.orderNumber}
                  onChange={(e) => setNewOrder({ ...newOrder, orderNumber: e.target.value })}
                  className="w-full rounded-2xl bg-muted p-3 text-sm font-mono font-bold text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Nazwa Produktu
                </label>
                <input
                  type="text"
                  placeholder="np. Obudowa AL-220"
                  value={newOrder.productName}
                  onChange={(e) => setNewOrder({ ...newOrder, productName: e.target.value })}
                  className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Planowana Ilość (szt.)
                </label>
                <input
                  type="number"
                  min="1"
                  value={newOrder.quantity}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, quantity: parseInt(e.target.value) || 1 })
                  }
                  className="w-full rounded-2xl bg-muted p-3 text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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
