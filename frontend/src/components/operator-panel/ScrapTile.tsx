import { useState } from "react";
import { Check } from "lucide-react";
import type { MachinePanelConfig } from "@/lib/api";
import { useScrapCategoriesQuery, useScrapMutations } from "@/hooks/use-scrap";
import { PanelButton, PanelEmpty, PanelTile } from "./PanelTile";

const QUICK_QUANTITIES = [1, 2, 5, 10];

/**
 * Zgłoszenie odrzutu z przycisku operatora.
 *
 * Dwa kroki, nie jeden: najpierw ile, potem dlaczego. Odwrotna kolejność
 * kusi, bo przyczyn jest więcej, ale to liczba jest tym, co operator ma
 * w głowie w momencie sięgania po panel — przyczynę dobiera już świadomie.
 *
 * Na maszynie liczącej odrzut z czujnika ten kafelek nie przyjmuje zgłoszeń:
 * ręczne dopisywanie do licznika podwajałoby braki. Wyjątkiem jest tryb „oba",
 * w którym czujnik liczy sztuki, a operator dokłada te spoza automatu.
 */
export function ScrapTile({ config }: { config: MachinePanelConfig }) {
  const { data: categories = [] } = useScrapCategoriesQuery();
  const { reportMutation } = useScrapMutations();
  const [quantity, setQuantity] = useState<number>(1);
  const [justSent, setJustSent] = useState<string | null>(null);

  if (config.scrapSource === "telemetry") {
    return (
      <PanelTile title="Odrzut (SCRAP)" icon="Trash2" hint="Źródło: czujnik">
        <PanelEmpty
          message={`Odrzut na tej maszynie liczy czujnik z tagu „${config.scrapTag}". Ręczne zgłoszenie podwoiłoby braki, więc przycisk jest wyłączony — przyczyny nadaje się w module Odrzut.`}
        />
      </PanelTile>
    );
  }

  if (categories.length === 0) {
    return (
      <PanelTile title="Odrzut (SCRAP)" icon="Trash2">
        <PanelEmpty message="Katalog przyczyn odrzutu jest pusty. Uzupełnij go w Ustawieniach, inaczej nie ma czego wybrać przy zgłoszeniu." />
      </PanelTile>
    );
  }

  const send = (categoryCode: string, label: string) => {
    reportMutation.mutate(
      { machineId: config.machineId, quantity, categoryCode },
      {
        onSuccess: () => {
          // Potwierdzenie musi być widoczne bez czytania — operator odchodzi od
          // panelu w sekundę po kliknięciu.
          setJustSent(`${quantity} szt. · ${label}`);
          setQuantity(1);
          setTimeout(() => setJustSent(null), 4000);
        },
      },
    );
  };

  return (
    <PanelTile
      title="Odrzut (SCRAP)"
      icon="Trash2"
      hint={config.scrapSource === "both" ? "Źródło: czujnik + operator" : "Źródło: operator"}
    >
      {justSent && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-success/20 px-4 py-3 text-sm font-bold text-success-foreground">
          <Check className="h-4 w-4 shrink-0" />
          Zapisano odrzut: {justSent}
        </div>
      )}

      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        1. Ile sztuk
      </div>
      <div className="grid grid-cols-4 gap-2">
        {QUICK_QUANTITIES.map((value) => (
          <PanelButton
            key={value}
            tone={quantity === value ? "primary" : "neutral"}
            onClick={() => setQuantity(value)}
          >
            {value}
          </PanelButton>
        ))}
      </div>

      <div className="mb-1 mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        2. Przyczyna — dotknięcie zapisuje zgłoszenie
      </div>
      <div className="grid grid-cols-2 gap-2">
        {categories.map((category) => (
          <PanelButton
            key={category.code}
            tone="danger"
            disabled={reportMutation.isPending}
            onClick={() => send(category.code, category.label)}
            className="text-sm"
          >
            {category.label}
          </PanelButton>
        ))}
      </div>

      {reportMutation.error && (
        <p className="mt-2 rounded-xl bg-destructive/15 px-3 py-2 text-xs text-destructive">
          {(reportMutation.error as Error).message}
        </p>
      )}
    </PanelTile>
  );
}
