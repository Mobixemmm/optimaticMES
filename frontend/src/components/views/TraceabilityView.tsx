import { useState } from "react";
import { Search, Info, PackageSearch, ScrollText } from "lucide-react";
import { useOrdersQuery } from "@/hooks/use-orders";
import { useBatchesQuery, useBatchTraceQuery, useOrderTraceQuery } from "@/hooks/use-traceability";
import { Header } from "@/components/shared/Header";

type OrderRow = { id: number; orderNumber: string; productName: string };
type Mode = "order" | "batch";

const STATUS_TONE: Record<string, string> = {
  open: "bg-warning/20 text-warning-foreground",
  reworked: "bg-success/15 text-success",
  scrapped: "bg-destructive/15 text-destructive",
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TraceabilityView() {
  const [mode, setMode] = useState<Mode>("order");

  const { data: orders } = useOrdersQuery();
  const orderList: OrderRow[] = Array.isArray(orders) ? orders : [];

  const [orderId, setOrderId] = useState<number | null>(null);
  const activeOrderId = orderId ?? orderList[0]?.id ?? null;
  const { data: trace, isLoading: traceLoading } = useOrderTraceQuery(
    mode === "order" ? activeOrderId : null,
  );

  const { data: batches } = useBatchesQuery();
  const [batchInput, setBatchInput] = useState("");
  const [submittedBatch, setSubmittedBatch] = useState("");
  const { data: batchTrace, isLoading: batchLoading } = useBatchTraceQuery(
    mode === "batch" ? submittedBatch : "",
  );

  return (
    <>
      <Header
        title="Genealogia"
        subtitle="Paszport wyrobu w przód i ścieżka wycofania partii wstecz."
      />

      <div className="flex gap-2">
        <button
          onClick={() => setMode("order")}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            mode === "order"
              ? "bg-gradient-primary text-primary-foreground shadow-elegant"
              : "bg-muted text-foreground hover:bg-accent"
          }`}
        >
          <ScrollText className="h-4 w-4" /> Paszport zlecenia
        </button>
        <button
          onClick={() => setMode("batch")}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            mode === "batch"
              ? "bg-gradient-primary text-primary-foreground shadow-elegant"
              : "bg-muted text-foreground hover:bg-accent"
          }`}
        >
          <PackageSearch className="h-4 w-4" /> Szukaj po partii
        </button>
      </div>

      {mode === "order" && (
        <section className="rounded-3xl bg-card p-6 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-foreground">Paszport wyrobu</h3>
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
          </div>

          {traceLoading && (
            <div className="p-6 text-center text-muted-foreground">Ładowanie...</div>
          )}

          {trace && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-muted/50 p-4 sm:grid-cols-4">
                <Fact label="Zlecenie" value={trace.order.orderNumber} mono />
                <Fact label="Produkt" value={trace.order.productName} />
                <Fact
                  label="Wykonano"
                  value={`${trace.order.producedQuantity} / ${trace.order.quantity} szt.`}
                />
                <Fact label="Braki" value={`${trace.order.scrapQuantity} szt.`} />
                <Fact label="Start" value={fmtDate(trace.order.actualStart)} />
                <Fact label="Koniec" value={fmtDate(trace.order.actualEnd)} />
                <Fact
                  label="Maszyny"
                  value={trace.machines.length > 0 ? trace.machines.join(", ") : "—"}
                />
                <Fact label="Status" value={trace.order.status} />
              </div>

              <TraceBlock title="Materiały i partie" count={trace.materials.length}>
                {trace.materials.length === 0 ? (
                  <Empty text="Nie zarejestrowano wydania materiału na to zlecenie." />
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3">Materiał</th>
                        <th className="px-4 py-3">Partia</th>
                        <th className="px-4 py-3">Ilość</th>
                        <th className="px-4 py-3">Wydał</th>
                        <th className="px-4 py-3">Kiedy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trace.materials.map((m) => (
                        <tr key={m.id} className="border-t border-border">
                          <td className="px-4 py-3">
                            <span className="font-medium text-foreground">{m.name}</span>
                            <span className="block font-mono text-xs text-muted-foreground">
                              {m.code}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setMode("batch");
                                setBatchInput(m.batchNumber);
                                setSubmittedBatch(m.batchNumber);
                              }}
                              className="rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-primary hover:bg-primary/20"
                              title="Pokaż wszystkie zlecenia z tej partii"
                            >
                              {m.batchNumber}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {m.quantity.toLocaleString("pl-PL")} {m.unit}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{m.consumedBy ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {fmtDate(m.consumedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </TraceBlock>

              <TraceBlock title="Wady jakościowe" count={trace.defects.length}>
                {trace.defects.length === 0 ? (
                  <Empty text="Brak zarejestrowanych wad." />
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3">Wada</th>
                        <th className="px-4 py-3">Ilość</th>
                        <th className="px-4 py-3">Maszyna</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Kiedy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trace.defects.map((d) => (
                        <tr key={d.id} className="border-t border-border">
                          <td className="px-4 py-3 font-medium text-foreground">{d.label}</td>
                          <td className="px-4 py-3 text-foreground">{d.quantity} szt.</td>
                          <td className="px-4 py-3 text-muted-foreground">{d.machineId ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                STATUS_TONE[d.status] ?? "bg-muted text-muted-foreground"
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {fmtDate(d.detectedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </TraceBlock>

              <TraceBlock title="Obsada" count={trace.operators.length}>
                {/* Uczciwe zastrzeżenie: sesje operatorów nie mają powiązania ze
                    zleceniem, więc to jest pokrycie czasowe, nie rejestracja obsady. */}
                {trace.operatorsAreInferred && (
                  <div className="mb-3 flex items-start gap-2 rounded-xl bg-primary/10 p-3 text-xs text-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>
                      Lista wynika z <strong>pokrycia czasowego</strong> sesji logowania z okresem
                      zlecenia — system nie rejestruje jeszcze przypisania operatora do zlecenia.
                      Traktuj jako poszlakę, nie dowód.
                    </span>
                  </div>
                )}
                {trace.operators.length === 0 ? (
                  <Empty text="Brak sesji operatorów w oknie czasowym zlecenia." />
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3">Operator</th>
                        <th className="px-4 py-3">Zalogowany</th>
                        <th className="px-4 py-3">Wylogowany</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trace.operators.map((o) => (
                        <tr key={o.sessionId} className="border-t border-border">
                          <td className="px-4 py-3 font-medium text-foreground">{o.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {fmtDate(o.loginTime)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {o.logoutTime ? fmtDate(o.logoutTime) : "trwa"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </TraceBlock>
            </div>
          )}
        </section>
      )}

      {mode === "batch" && (
        <section className="rounded-3xl bg-card p-6 shadow-card">
          <h3 className="mb-1 text-lg font-semibold text-foreground">Ścieżka wycofania</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Dostawca zgłosił wadę partii? Tu zobaczysz wszystkie zlecenia, do których trafiła.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmittedBatch(batchInput.trim());
            }}
            className="mb-4 flex flex-wrap gap-2"
          >
            <input
              type="text"
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              list="batch-suggestions"
              placeholder="Numer partii, np. LOT-2026-0345"
              className="min-w-[240px] flex-1 rounded-2xl border border-border bg-muted p-3 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <datalist id="batch-suggestions">
              {(batches ?? []).map((b) => (
                <option key={b.batchNumber} value={b.batchNumber}>
                  {b.orderCount} zleceń
                </option>
              ))}
            </datalist>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90"
            >
              <Search className="h-4 w-4" /> Szukaj
            </button>
          </form>

          {batchLoading && <div className="p-6 text-center text-muted-foreground">Szukam...</div>}

          {batchTrace && !batchTrace.found && (
            <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
              Partia „{batchTrace.batchNumber}" nie występuje w żadnym wydaniu materiału.
            </div>
          )}

          {batchTrace && batchTrace.found && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-muted/50 p-4 sm:grid-cols-4">
                <Fact label="Partia" value={batchTrace.batchNumber} mono />
                <Fact label="Materiał" value={batchTrace.material?.name ?? "—"} />
                <Fact
                  label="Zużyto łącznie"
                  value={`${batchTrace.totalQuantity.toLocaleString("pl-PL")} ${batchTrace.material?.unit ?? ""}`}
                />
                <Fact label="Dotknięte zlecenia" value={String(batchTrace.affectedOrders.length)} />
              </div>

              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Zlecenie</th>
                      <th className="px-4 py-3">Produkt</th>
                      <th className="px-4 py-3">Zużyto</th>
                      <th className="px-4 py-3">Wykonano</th>
                      <th className="px-4 py-3">Braki</th>
                      <th className="px-4 py-3">Pierwsze wydanie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchTrace.affectedOrders.map((o) => (
                      <tr key={o.orderId} className="border-t border-border">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              setMode("order");
                              setOrderId(o.orderId);
                            }}
                            className="font-mono text-xs font-semibold text-primary hover:underline"
                            title="Pokaż paszport tego zlecenia"
                          >
                            {o.orderNumber}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-foreground">{o.productName}</td>
                        <td className="px-4 py-3 text-foreground">
                          {o.consumedQuantity.toLocaleString("pl-PL")}{" "}
                          {batchTrace.material?.unit ?? ""}
                        </td>
                        <td className="px-4 py-3 text-foreground">{o.producedQuantity} szt.</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              o.scrapQuantity > 0
                                ? "font-semibold text-destructive"
                                : "text-muted-foreground"
                            }
                          >
                            {o.scrapQuantity} szt.
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {fmtDate(o.firstConsumedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`text-sm font-semibold text-foreground ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function TraceBlock({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
          {count}
        </span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="p-6 text-center text-sm text-muted-foreground">{text}</div>;
}
