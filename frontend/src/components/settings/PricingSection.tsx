import { useState } from "react";
import { Receipt } from "lucide-react";
import { useModulesAdmin } from "@/lib/bootstrap";
import { SectionHeading } from "./SectionHeading";

/**
 * Koszt wybranej konfiguracji.
 *
 * Cennik jest liczony z tych samych danych, z których działa aplikacja
 * (pricing w rejestrze modułów), a nie z arkusza obok. Dzięki temu nie da się
 * doprowadzić do stanu, w którym klient ma włączony moduł, za który nikt nie
 * wystawił faktury — albo płaci za zakładkę, której nie widzi.
 */
export function PricingSection() {
  const { modules } = useModulesAdmin(true);
  const [stations, setStations] = useState(10);

  const paid = modules.filter((m) => !m.pricing.inPackage);
  const enabledPaid = paid.filter((m) => m.enabled);
  const inPackage = modules.filter((m) => m.pricing.inPackage);

  const perStation = enabledPaid.reduce((sum, m) => sum + m.pricing.pricePerStation, 0);
  const monthly = perStation * Math.max(0, stations);

  return (
    <div className="rounded-3xl bg-card p-6 shadow-card border border-border/50">
      <SectionHeading
        icon={Receipt}
        title="Koszt konfiguracji"
        description="Liczone z modułów faktycznie włączonych powyżej. Moduły z pakietu bazowego nie podnoszą stawki; każdy dodatek jest płatny za stanowisko."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Liczba stanowisk
          </span>
          <input
            type="number"
            min={1}
            value={stations}
            onChange={(e) => setStations(Number.parseInt(e.target.value, 10) || 0)}
            className="rounded-2xl bg-muted px-4 py-3 text-lg font-bold tabular-nums text-foreground border border-border outline-none focus:border-primary"
          />
        </label>

        <div className="rounded-2xl bg-muted/60 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Dopłata za stanowisko
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground">{perStation} zł</div>
          <div className="text-[11px] text-muted-foreground">
            {enabledPaid.length} z {paid.length} dodatków
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-primary px-4 py-3 text-primary-foreground shadow-elegant">
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
            Razem miesięcznie
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {monthly.toLocaleString("pl-PL")} zł
          </div>
          <div className="text-[11px] opacity-80">
            {stations} × {perStation} zł
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            W pakiecie ({inPackage.length})
          </h4>
          <ul className="flex flex-wrap gap-1.5">
            {inPackage.map((module) => (
              <li
                key={module.key}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                  module.enabled
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground line-through"
                }`}
              >
                {module.label}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Dodatki płatne ({paid.length})
          </h4>
          <ul className="flex flex-col gap-1">
            {paid
              .slice()
              .sort((a, b) => b.pricing.pricePerStation - a.pricing.pricePerStation)
              .map((module) => (
                <li
                  key={module.key}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-xs"
                >
                  <span
                    className={
                      module.enabled ? "font-semibold text-foreground" : "text-muted-foreground"
                    }
                  >
                    {module.label}
                    {module.readiness === "preview" && (
                      <span
                        className="ml-2 rounded bg-warning/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-warning-foreground"
                        title="Zakładka istnieje, logiki domenowej jeszcze nie ma"
                      >
                        w budowie
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 tabular-nums ${
                      module.enabled ? "font-bold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    +{module.pricing.pricePerStation} zł
                  </span>
                </li>
              ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
