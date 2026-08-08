import type { ReactNode } from "react";
import { resolveIcon } from "@/lib/icons";

/**
 * Powłoka kafelka HMI.
 *
 * Panel wisi przy maszynie i jest obsługiwany palcem w rękawicy, często pod
 * kątem i w gorszym świetle — stąd większe odstępy, grubsze napisy i cele
 * trafienia nieporównywalnie większe niż w widokach biurowych. To nie jest
 * ozdobnik: kafelek, w który trzeba celować, po prostu nie zostanie użyty.
 */
export function PanelTile({
  title,
  icon,
  hint,
  children,
  className = "",
}: {
  title: string;
  icon: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  const Icon = resolveIcon(icon);

  return (
    <section className={`flex flex-col rounded-3xl bg-card p-5 shadow-card ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-4.5 w-4.5 text-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-foreground">{title}</h3>
          {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="mt-4 min-h-0 flex-1">{children}</div>
    </section>
  );
}

/** Komunikat wewnątrz kafelka, gdy nie ma czym go wypełnić. */
export function PanelEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[6rem] items-center justify-center rounded-2xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

/** Duży przycisk dotykowy — domyślna jednostka interakcji w panelu. */
export function PanelButton({
  onClick,
  disabled,
  tone = "neutral",
  children,
  className = "",
}: {
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "primary" | "danger" | "warning";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-muted text-foreground hover:bg-accent",
    primary: "bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-90",
    danger: "bg-destructive/15 text-destructive hover:bg-destructive/25",
    warning: "bg-warning/20 text-warning-foreground hover:bg-warning/30",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[3.25rem] rounded-2xl px-4 py-3 text-base font-bold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}
