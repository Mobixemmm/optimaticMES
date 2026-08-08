import type { LucideIcon } from "lucide-react";

/**
 * Nagłówek sekcji panelu administratora.
 *
 * Ikona jest komponentem z zestawu, a nie emoji w treści nagłówka. Emoji
 * renderuje się inaczej na każdym systemie, nie dziedziczy koloru motywu,
 * czytnik ekranu odczytuje je jako słowo („fabryka", „worek pieniędzy"),
 * a w panelu administracyjnym systemu produkcyjnego wygląda po prostu
 * nieprofesjonalnie.
 */
export function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3 border-b border-border pb-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-4.5 w-4.5 text-foreground" />
      </div>
      <div className="min-w-0">
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
