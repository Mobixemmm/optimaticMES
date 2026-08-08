// Wyznaczenie zmiany trwającej w tej chwili na podstawie kalendarza z bazy.
// Wcześniej kafelek w menu pokazywał zaszyte na sztywno „Zmiana II · 14–22"
// i „64%" — dane wyglądające na żywe, a wymyślone. Klient, który raz to
// zauważy, przestaje ufać każdej innej liczbie w systemie.

export interface ShiftLike {
  name: string;
  /** Konwencja Date.getDay(): 0 = niedziela. */
  dayOfWeek: number;
  /** Format „HH:mm", czas lokalny. */
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface CurrentShift {
  name: string;
  startTime: string;
  endTime: string;
  /** Postęp zmiany w procentach, 0–100. */
  progressPct: number;
  minutesLeft: number;
}

const MINUTES_IN_DAY = 24 * 60;

function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Zwraca zmianę obejmującą podany moment albo null, gdy żadna nie trwa.
 *
 * Obsługuje zmiany nocne w obie strony: zaczętą dziś wieczorem i tę zaczętą
 * wczoraj, która trwa jeszcze dziś nad ranem. Bez drugiego przypadku kafelek
 * gasłby o północy w środku zmiany — czyli dokładnie wtedy, gdy jest potrzebny.
 */
export function findCurrentShift(shifts: ShiftLike[], now: Date = new Date()): CurrentShift | null {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const today = now.getDay();
  const yesterday = (today + 6) % 7;

  for (const shift of shifts.filter((s) => s.isActive)) {
    const start = toMinutes(shift.startTime);
    const end = toMinutes(shift.endTime);
    // Koniec wcześniejszy lub równy startowi znaczy przejście przez północ.
    const isOvernight = end <= start;

    if (shift.dayOfWeek === today) {
      const endAbsolute = isOvernight ? end + MINUTES_IN_DAY : end;
      if (nowMinutes >= start && nowMinutes < endAbsolute) {
        return describe(shift, start, endAbsolute, nowMinutes);
      }
    }

    if (isOvernight && shift.dayOfWeek === yesterday && nowMinutes < end) {
      // Start był wczoraj, więc na osi „dzisiaj" leży przed zerem.
      return describe(shift, start - MINUTES_IN_DAY, end, nowMinutes);
    }
  }

  return null;
}

function describe(shift: ShiftLike, start: number, end: number, nowMinutes: number): CurrentShift {
  const duration = Math.max(1, end - start);
  const elapsed = Math.min(duration, Math.max(0, nowMinutes - start));

  return {
    name: shift.name,
    startTime: shift.startTime,
    endTime: shift.endTime,
    progressPct: Math.round((elapsed / duration) * 100),
    minutesLeft: Math.max(0, end - nowMinutes),
  };
}
