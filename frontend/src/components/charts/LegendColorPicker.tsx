import { useEffect, useMemo, useRef, useState } from "react";
import { Palette, RotateCcw, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  resolveCssColorToHex,
  useLegendColors,
  type ReasonColorOverrides,
} from "@/lib/analytics/legend-colors";
import { defaultReasonColor, REASON_ORDER, reasonLabel } from "@/lib/analytics/palette";

// Natywny próbnik zgłasza zmianę przy każdym ruchu myszy po gradiencie. Zapis
// idzie więc dopiero, gdy wybór się ustabilizuje — inaczej jedno przeciągnięcie
// wysłałoby kilkadziesiąt PUT-ów pod rząd.
const SAVE_DEBOUNCE_MS = 400;

/**
 * Wybór kolorów legendy — przypisany do konta, nie do przeglądarki.
 *
 * Powód, dla którego to w ogóle istnieje: paleta domyślna jest zwalidowana pod
 * kątem widzenia barwnego, ale nie zna ani kolorów przyjętych na konkretnej
 * hali, ani indywidualnej wady widzenia. Jedno i drugie jest cechą człowieka,
 * a nie klienta, więc ustawienie siedzi przy użytkowniku i idzie za nim na
 * każdą maszynę, na której się zaloguje.
 */
export function LegendColorPicker() {
  const { overrides, save, reset, isSaving, error, canPersist } = useLegendColors();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ReasonColorOverrides>(overrides);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Domyślne odcienie to tokeny motywu, a <input type="color"> przyjmuje tylko
  // #rrggbb — rozwiązujemy je przy otwarciu panelu, czyli już po ewentualnym
  // przełączeniu trybu jasny/ciemny.
  const defaults = useMemo(() => {
    if (!open) return {} as Record<string, string>;
    return Object.fromEntries(
      REASON_ORDER.map((reason) => [reason, resolveCssColorToHex(defaultReasonColor(reason))]),
    );
  }, [open]);

  const commit = (next: ReasonColorOverrides) => {
    setDraft(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(next), SAVE_DEBOUNCE_MS);
  };

  const setColor = (reason: string, hex: string) => commit({ ...draft, [reason]: hex });

  const clearColor = (reason: string) => {
    const next = { ...draft };
    delete next[reason];
    commit(next);
  };

  const resetAll = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setDraft({});
    void reset();
  };

  const changedCount = Object.keys(draft).length;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        // Panel zawsze startuje od stanu zapisanego na serwerze — po zamknięciu
        // i ponownym otwarciu nie ma szans zobaczyć nieistniejącej już wersji.
        if (next) setDraft(overrides);
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
          title="Dobierz kolory przyczyn przestoju"
        >
          <Palette className="h-3.5 w-3.5" />
          Kolory legendy
          {changedCount > 0 && (
            <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
              {changedCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 rounded-2xl border-border bg-popover p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-popover-foreground">Kolory legendy</h4>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {canPersist
                ? "Zapisujemy je przy Twoim koncie — zobaczysz je też na innym komputerze."
                : "Zaloguj się, aby zapisać kolory przy koncie."}
            </p>
          </div>
          {isSaving && (
            <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>

        <ul className="mt-3 space-y-1">
          {REASON_ORDER.map((reason) => {
            const isCustom = draft[reason] !== undefined;
            const value = draft[reason] ?? defaults[reason] ?? "#888888";
            const inputId = `legend-color-${reason}`;
            return (
              <li key={reason} className="flex items-center gap-2.5">
                <input
                  id={inputId}
                  type="color"
                  value={value}
                  disabled={!canPersist}
                  onChange={(e) => setColor(reason, e.target.value)}
                  className="h-7 w-7 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0"
                />
                <label
                  htmlFor={inputId}
                  className="min-w-0 flex-1 cursor-pointer truncate text-xs text-popover-foreground"
                >
                  {reasonLabel(reason)}
                </label>
                <span className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground">
                  {value}
                </span>
                {/* Miejsce na przycisk jest rezerwowane zawsze, żeby wiersze nie
                    skakały w bok przy pierwszej zmianie koloru. */}
                <span className="h-6 w-6 shrink-0">
                  {isCustom && (
                    <button
                      onClick={() => clearColor(reason)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      title={`Przywróć domyślny kolor: ${reasonLabel(reason)}`}
                      aria-label={`Przywróć domyślny kolor: ${reasonLabel(reason)}`}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>

        {error && (
          <p className="mt-3 rounded-lg bg-destructive/15 px-2.5 py-1.5 text-[11px] text-destructive">
            Nie udało się zapisać: {error}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          {/* Nadpisanie jest jedno na oba motywy — inaczej "mój czerwony" znaczyłby
              co innego rano i wieczorem. Domyślne sloty dalej przestawiają się same. */}
          <span className="text-[10px] leading-tight text-muted-foreground">
            Wybrany kolor obowiązuje w trybie jasnym i ciemnym.
          </span>
          <button
            onClick={resetAll}
            disabled={changedCount === 0 || !canPersist}
            className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            Przywróć domyślne
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
