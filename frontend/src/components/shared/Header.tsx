import type { ReactNode } from "react";

export function Header({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {/* Brak `action` (albo widok świadomie przekazał `undefined`, bo rola nie
          ma uprawnień) ma znaczyć "nic tu nie pokazuj" — nie podstawiamy w to
          miejsce żadnego domyślnego przycisku, bo dla roli bez uprawnień
          wyglądałby na klikalny, a nic by nie robił. */}
      {action && <div className="flex gap-2">{action}</div>}
    </div>
  );
}
