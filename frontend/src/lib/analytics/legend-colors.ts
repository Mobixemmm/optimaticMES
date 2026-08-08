import { createContext, useContext } from "react";
import { defaultReasonColor } from "./palette";

/** Przyczyna przestoju → kolor #rrggbb wybrany przez użytkownika. */
export type ReasonColorOverrides = Record<string, string>;

export interface LegendColorApi {
  /**
   * Wartość do wstawienia w CSS. Nadpisanie użytkownika jest zwykłym hexem,
   * brak nadpisania — tokenem motywu, więc slot domyślny nadal sam przestawia
   * się między trybem jasnym a ciemnym.
   */
  colorOf: (reason: string) => string;
  /** Same nadpisania. Puste = użytkownik nic nie zmieniał. */
  overrides: ReasonColorOverrides;
  /** Zapisuje PEŁNY stan nadpisań; slot pominięty wraca do domyślnego. */
  save: (overrides: ReasonColorOverrides) => Promise<void>;
  /** Kasuje wszystkie nadpisania tego użytkownika. */
  reset: () => Promise<void>;
  isSaving: boolean;
  /** Komunikat nieudanego zapisu — kolory zostają wtedy sprzed zmiany. */
  error: string | null;
  /** Czy w ogóle da się zapisywać (gość bez konta ma tylko domyślne kolory). */
  canPersist: boolean;
}

export const LegendColorContext = createContext<LegendColorApi | null>(null);

/**
 * Kolory legendy dla wizuali analityki. Poza providerem zwraca domyślne odcienie
 * zamiast rzucać — wykres bez zapisanych preferencji ma się rysować normalnie,
 * a nie wywalać stronę.
 */
export function useLegendColors(): LegendColorApi {
  const ctx = useContext(LegendColorContext);
  return ctx ?? FALLBACK_LEGEND_COLORS;
}

const FALLBACK_LEGEND_COLORS: LegendColorApi = {
  colorOf: defaultReasonColor,
  overrides: {},
  save: async () => {},
  reset: async () => {},
  isSaving: false,
  error: null,
  canPersist: false,
};

/**
 * Zamienia dowolny zapis koloru na #rrggbb, którego wymaga <input type="color">.
 *
 * Domyślne odcienie są tokenami CSS — część w hexie, część w oklch — więc nie da
 * się ich po prostu wpisać do inputa. Malujemy je na jednopikselowym płótnie
 * i odczytujemy piksel: przeglądarka robi całą konwersję przestrzeni barw za nas,
 * niezależnie od tego, w jakiej notacji token był zapisany.
 */
export function resolveCssColorToHex(cssColor: string, fallback = "#888888"): string {
  if (/^#[0-9a-f]{6}$/i.test(cssColor)) return cssColor.toLowerCase();
  if (typeof document === "undefined") return fallback;

  const value = cssColor.startsWith("var(")
    ? getComputedStyle(document.documentElement)
        .getPropertyValue(cssColor.slice(4, -1).trim())
        .trim()
    : cssColor;
  if (!value) return fallback;
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return fallback;

  ctx.fillStyle = fallback;
  // Nieznana notacja nie nadpisze fillStyle — zostanie fallback, zamiast
  // wyrzucić wyjątek w środku renderu.
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
