import { useState } from "react";
import { Info, Plus, Trash2 } from "lucide-react";
import { Header } from "@/components/shared/Header";
import { ChartCard, ChartEmpty } from "@/components/charts/ChartCard";
import { useShiftMutations, useShiftsQuery } from "@/hooks/use-shifts";
import { useBootstrap } from "@/lib/bootstrap";

// dayOfWeek zgodnie z konwencją Date.getDay(): 0 = niedziela.
const DAYS = [
  { value: 1, label: "Poniedziałek", short: "Pn" },
  { value: 2, label: "Wtorek", short: "Wt" },
  { value: 3, label: "Środa", short: "Śr" },
  { value: 4, label: "Czwartek", short: "Cz" },
  { value: 5, label: "Piątek", short: "Pt" },
  { value: 6, label: "Sobota", short: "So" },
  { value: 0, label: "Niedziela", short: "Nd" },
];

/**
 * Harmonogramy czasowe — tygodniowy kalendarz zmian.
 *
 * To nie jest ozdobnik obok analityki: suma godzin z tego kalendarza jest
 * czasem planowanym, przez który dzieli się Dostępność w OEE. Pusty kalendarz
 * znaczy „zero czasu planowanego", a wtedy OEE nie ma z czego się policzyć.
 */
export function SchedulesView() {
  const { data: shifts = [] } = useShiftsQuery();
  const { createMutation, updateMutation, deleteMutation } = useShiftMutations();
  const { can } = useBootstrap();
  const canWrite = can("shifts.write");

  const [form, setForm] = useState({
    name: "Zmiana I",
    dayOfWeek: 1,
    startTime: "06:00",
    endTime: "14:00",
  });

  const byDay = new Map(DAYS.map((d) => [d.value, shifts.filter((s) => s.dayOfWeek === d.value)]));

  const weeklyMinutes = shifts
    .filter((s) => s.isActive)
    .reduce((sum, shift) => sum + minutesBetween(shift.startTime, shift.endTime), 0);

  return (
    <>
      <Header
        title="Harmonogramy czasowe"
        subtitle="Tygodniowy kalendarz zmian. Z niego bierze się czas planowany, przez który dzieli się Dostępność w OEE."
      />

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_20rem]">
        <ChartCard
          title="Tydzień produkcyjny"
          subtitle={`${shifts.filter((s) => s.isActive).length} aktywnych zmian · ${Math.round(
            weeklyMinutes / 60,
          )} h tygodniowo`}
        >
          {shifts.length === 0 ? (
            <ChartEmpty message="Kalendarz zmian jest pusty, więc czas planowany wynosi zero i Dostępność w OEE nie ma z czego się policzyć. Dodaj pierwszą zmianę po prawej." />
          ) : (
            <ul className="flex flex-col gap-2">
              {DAYS.map((day) => {
                const list = byDay.get(day.value) ?? [];
                return (
                  <li key={day.value} className="flex items-start gap-3">
                    <span className="mt-2 w-24 shrink-0 text-xs font-semibold text-muted-foreground">
                      {day.label}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                      {list.length === 0 ? (
                        <span className="py-2 text-xs text-muted-foreground">dzień wolny</span>
                      ) : (
                        list.map((shift) => (
                          <span
                            key={shift.id}
                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                              shift.isActive
                                ? "bg-accent text-accent-foreground"
                                : "bg-muted text-muted-foreground line-through"
                            }`}
                          >
                            {shift.name}
                            <span className="tabular-nums opacity-80">
                              {shift.startTime}–{shift.endTime}
                            </span>
                            {canWrite && (
                              <>
                                <button
                                  onClick={() =>
                                    updateMutation.mutate({
                                      id: shift.id,
                                      isActive: !shift.isActive,
                                    })
                                  }
                                  className="rounded px-1 text-[10px] font-bold uppercase opacity-70 hover:opacity-100"
                                  title={shift.isActive ? "Wyłącz zmianę" : "Włącz zmianę"}
                                >
                                  {shift.isActive ? "wył." : "wł."}
                                </button>
                                <button
                                  onClick={() => deleteMutation.mutate(shift.id)}
                                  className="rounded p-0.5 opacity-70 hover:opacity-100"
                                  aria-label={`Usuń zmianę ${shift.name}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ChartCard>

        {canWrite && (
          <div className="rounded-3xl bg-card p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground">Dodaj zmianę</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Jedna pozycja to jedna zmiana w jednym dniu tygodnia.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Nazwa
                </span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-foreground outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Dzień tygodnia
                </span>
                <select
                  value={form.dayOfWeek}
                  onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
                  className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-foreground outline-none"
                >
                  {DAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Od
                  </span>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="rounded-2xl bg-muted px-4 py-2.5 text-sm tabular-nums text-foreground outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Do
                  </span>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="rounded-2xl bg-muted px-4 py-2.5 text-sm tabular-nums text-foreground outline-none"
                  />
                </label>
              </div>

              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.name.trim()}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elegant transition hover:opacity-90 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Dodaj zmianę
              </button>

              {createMutation.error && (
                <p className="rounded-xl bg-destructive/15 px-3 py-2 text-xs text-destructive">
                  {(createMutation.error as Error).message}
                </p>
              )}

              <p className="flex items-start gap-2 text-[11px] leading-snug text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Zmiana przechodząca przez północ (np. 22:00–06:00) jest liczona do dnia, w którym
                się zaczyna.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Zmiana nocna kończy się „wcześniej", niż się zaczyna — bez tego doba
// wychodziłaby ujemna i tygodniowa suma godzin nie miałaby sensu.
function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  return endMin >= startMin ? endMin - startMin : 24 * 60 - startMin + endMin;
}
