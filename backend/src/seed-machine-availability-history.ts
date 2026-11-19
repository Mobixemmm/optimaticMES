import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { AppModule } from './app.module';
import { Machine } from './entities/machine.entity';
import {
  MachineStopEvent,
  StopReason,
} from './entities/machine-stop-event.entity';
import { Shift } from './entities/shift.entity';
import { ensureDemoMachines } from './seed-demo-machines';

/**
 * Historia dostępności maszyn — przestoje wstecz dla KAŻDEJ aktywnej maszyny.
 *
 * Dostępność (OEE A, wykres dzienny, pulpit analityczny) liczy się wyłącznie z
 * machine_stop_events na tle kalendarza zmian. seed-machine-stops daje kilkanaście
 * ręcznie wpisanych zdarzeń z ostatnich ~3 tygodni, więc wykresy dłuższe niż
 * dwa tygodnie są prawie płaskie. Ten seed generuje gęstą, realistyczną historię:
 *
 *  - domyślnie 90 dni wstecz (tyle maksymalnie zwraca /analytics/dataset),
 *  - przestoje tylko w godzinach zmian z tabeli `shifts` (brak zmian → pn–pt 06–22),
 *  - każda maszyna ma własny "charakter" (jedne psują się częściej, inne rzadziej),
 *    plus jedna poważniejsza awaria w okresie, żeby wykres miał wyraźny dołek,
 *  - lekki trend poprawy w czasie (starsze tygodnie odrobinę gorsze),
 *  - przestoje jednej maszyny nigdy na siebie nie nachodzą i nie nachodzą na
 *    przestoje już istniejące w bazie (np. z seed-machine-stops lub z panelu),
 *  - wszystkie są zamknięte i skończone przed "teraz" — nie tworzymy otwartych
 *    przestojów (pilnuje ich unikat uq_machine_stop_events_open).
 *
 * Losowość jest deterministyczna (ziarno z nazwy maszyny i daty), więc dwa
 * uruchomienia tego samego dnia dają te same dane.
 *
 * Seed jest powtarzalny: wiersze, które sam zapisał, oznacza prefiksem notatki
 * SEED_MARKER i przy kolejnym uruchomieniu najpierw je kasuje. Ręcznie
 * wprowadzonych przestojów nie dotyka.
 *
 * Użycie:
 *   npm run db:seed:availability-history            # 90 dni
 *   npm run db:seed:availability-history -- --days=180
 */

const DEFAULT_DAYS = 90;
const MAX_DAYS = 730;
const SEED_MARKER = '[historia demo]';

// Maszyny demo z pozostałych seedów — zakładamy je, gdy baza jest pusta, żeby
// seed dał wynik także na świeżej instalacji.
const DEMO_MACHINES = [
  'CNC-01 Mazak',
  'CNC-02 DMG',
  'Prasa PR-04',
  'Robot RB-07',
  'Linia LN-12',
];

// Zapas kalendarza, gdy w tabeli shifts nie ma żadnej aktywnej zmiany —
// taki sam jak domyślny z migracji CreateShiftsTable (2 zmiany, pn–pt).
const FALLBACK_SHIFTS: Pick<Shift, 'dayOfWeek' | 'startTime' | 'endTime'>[] = [
  1, 2, 3, 4, 5,
].flatMap((dayOfWeek) => [
  { dayOfWeek, startTime: '06:00', endTime: '14:00' },
  { dayOfWeek, startTime: '14:00', endTime: '22:00' },
]);

interface ReasonProfile {
  reason: StopReason;
  // Oczekiwana liczba zdarzeń na jedną zmianę (przed skalowaniem charakterem maszyny).
  perShift: number;
  minMinutes: number;
  maxMinutes: number;
  notes: string[];
}

const REASON_PROFILES: ReasonProfile[] = [
  {
    reason: 'micro_stop',
    perShift: 1.1,
    minMinutes: 2,
    maxMinutes: 12,
    notes: [
      'Zacięcie detalu',
      'Czujnik obecności',
      'Krótkie zatrzymanie podajnika',
    ],
  },
  {
    reason: 'setup',
    perShift: 0.55,
    minMinutes: 15,
    maxMinutes: 55,
    notes: [
      'Przezbrojenie na nowe zlecenie',
      'Wymiana narzędzia',
      'Ustawienie programu',
    ],
  },
  {
    reason: 'failure',
    perShift: 0.07,
    minMinutes: 25,
    maxMinutes: 150,
    notes: [
      'Awaria napędu',
      'Błąd sterownika',
      'Wyciek hydrauliki',
      'Awaria czujnika',
    ],
  },
  {
    reason: 'material',
    perShift: 0.08,
    minMinutes: 15,
    maxMinutes: 70,
    notes: ['Brak materiału na stanowisku', 'Oczekiwanie na wózek z magazynu'],
  },
  {
    reason: 'quality',
    perShift: 0.05,
    minMinutes: 10,
    maxMinutes: 45,
    notes: ['Kontrola pierwszej sztuki', 'Wymiar poza tolerancją — korekta'],
  },
  {
    reason: 'planned',
    perShift: 0.06,
    minMinutes: 30,
    maxMinutes: 60,
    notes: ['Przegląd planowy', 'Smarowanie i czyszczenie'],
  },
];

// --- deterministyczny PRNG ---------------------------------------------------

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Liczba zdarzeń z rozkładu Poissona (metoda Knutha — wystarczy dla małych λ).
function poisson(rand: () => number, lambda: number): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > limit);
  return k - 1;
}

function randInt(rand: () => number, min: number, max: number): number {
  return Math.floor(min + rand() * (max - min + 1));
}

function pick<T>(rand: () => number, items: T[]): T {
  return items[Math.floor(rand() * items.length)];
}

// --- pomocnicze --------------------------------------------------------------

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

function localDateKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function parseDaysArg(): number {
  const arg = process.argv.find((a) => a.startsWith('--days='));
  const fromEnv = process.env.SEED_HISTORY_DAYS;
  const raw = arg ? arg.slice('--days='.length) : fromEnv;
  const parsed = raw ? parseInt(raw, 10) : DEFAULT_DAYS;
  if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_DAYS;
  return Math.min(MAX_DAYS, parsed);
}

interface Interval {
  start: number;
  end: number;
}

function overlaps(intervals: Interval[], start: number, end: number): boolean {
  return intervals.some((i) => start < i.end && end > i.start);
}

type NewStop = Pick<
  MachineStopEvent,
  'tenantId' | 'machine' | 'reason' | 'startFailure' | 'endFailure' | 'notes'
>;

function generateForMachine(
  machine: Machine,
  shifts: Pick<Shift, 'dayOfWeek' | 'startTime' | 'endTime'>[],
  days: number,
  now: Date,
  busy: Interval[],
): NewStop[] {
  const profileRand = mulberry32(hashString(`profil:${machine.machineId}`));
  // Charakter maszyny: 0.6 = bardzo niezawodna, 1.6 = kłopotliwa.
  const reliability = 0.6 + profileRand() * 1.0;
  // Jedna poważna awaria w okresie (dzień liczony od początku okresu).
  const majorFailureDay = Math.floor(profileRand() * days);

  const result: NewStop[] = [];

  for (let offset = days; offset >= 0; offset--) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);

    const dayShifts = shifts.filter((s) => s.dayOfWeek === day.getDay());
    if (dayShifts.length === 0) continue;

    const rand = mulberry32(
      hashString(`${machine.machineId}|${localDateKey(day)}`),
    );
    // Trend: najstarsze dni ~25% gorsze niż ostatnie — widać efekt "poprawy".
    const trend = 1 + 0.25 * (offset / Math.max(1, days));
    const dayIndex = days - offset;

    for (const shift of dayShifts) {
      const shiftStart = new Date(day);
      shiftStart.setMinutes(toMinutes(shift.startTime));
      const startM = toMinutes(shift.startTime);
      const endM = toMinutes(shift.endTime);
      const durationMin = endM > startM ? endM - startM : 1440 - startM + endM;
      const shiftEnd = new Date(shiftStart.getTime() + durationMin * 60000);
      // Historia kończy się "teraz" — nie zapisujemy przyszłości.
      const windowEnd = Math.min(shiftEnd.getTime(), now.getTime());
      if (windowEnd <= shiftStart.getTime()) continue;

      const candidates: {
        reason: StopReason;
        minutes: number;
        notes: string;
      }[] = [];

      for (const profile of REASON_PROFILES) {
        // Planowe przestoje nie zależą od niezawodności maszyny.
        const scale = profile.reason === 'planned' ? 1 : reliability * trend;
        const count = poisson(rand, profile.perShift * scale);
        for (let i = 0; i < count; i++) {
          candidates.push({
            reason: profile.reason,
            minutes: randInt(rand, profile.minMinutes, profile.maxMinutes),
            notes: pick(rand, profile.notes),
          });
        }
      }

      if (dayIndex === majorFailureDay && shift === dayShifts[0]) {
        candidates.push({
          reason: 'failure',
          minutes: randInt(rand, 180, Math.min(360, durationMin - 30)),
          notes: 'Poważna awaria — oczekiwanie na serwis',
        });
      }

      // Najdłuższe najpierw, żeby duże zdarzenia miały szansę się zmieścić.
      candidates.sort((a, b) => b.minutes - a.minutes);

      for (const c of candidates) {
        const latestStart = windowEnd - c.minutes * 60000;
        if (latestStart <= shiftStart.getTime()) continue;
        // Kilka prób znalezienia wolnego miejsca w zmianie.
        for (let attempt = 0; attempt < 6; attempt++) {
          const startMs =
            shiftStart.getTime() +
            Math.floor(
              (rand() * (latestStart - shiftStart.getTime())) / 60000,
            ) *
              60000;
          const endMs = startMs + c.minutes * 60000;
          // Minuta odstępu, żeby przestoje się nie "sklejały".
          if (overlaps(busy, startMs - 60000, endMs + 60000)) continue;
          busy.push({ start: startMs, end: endMs });
          result.push({
            tenantId: machine.tenantId,
            machine: machine.machineId,
            reason: c.reason,
            startFailure: new Date(startMs),
            endFailure: new Date(endMs),
            notes: `${SEED_MARKER} ${c.notes}`,
          });
          break;
        }
      }
    }
  }

  return result;
}

async function bootstrap() {
  const days = parseDaysArg();
  const app = await NestFactory.createApplicationContext(AppModule);
  const stopRepo = app.get<Repository<MachineStopEvent>>(
    getRepositoryToken(MachineStopEvent),
  );
  const machineRepo = app.get<Repository<Machine>>(getRepositoryToken(Machine));
  const shiftRepo = app.get<Repository<Shift>>(getRepositoryToken(Shift));

  if ((await machineRepo.count({ where: { isActive: true } })) === 0) {
    await ensureDemoMachines(app, DEMO_MACHINES);
  }
  const machines = await machineRepo.find({ where: { isActive: true } });

  const activeShifts = await shiftRepo.find({ where: { isActive: true } });
  const shifts = activeShifts.length > 0 ? activeShifts : FALLBACK_SHIFTS;
  if (activeShifts.length === 0) {
    console.log('ℹ️ Brak aktywnych zmian w bazie — używam pn–pt 06:00–22:00.');
  }

  const removed = await stopRepo.delete({ notes: Like(`${SEED_MARKER}%`) });
  if (removed.affected) {
    console.log(
      `🧹 Usunięto ${removed.affected} przestojów z poprzedniego uruchomienia seeda`,
    );
  }

  const now = new Date();
  const since = new Date(now);
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - days - 1);

  let total = 0;
  for (const machine of machines) {
    // Istniejące (nie-seedowe) przestoje tej maszyny traktujemy jako zajęty czas.
    const existing = await stopRepo
      .createQueryBuilder('stop')
      .where('stop.tenantId = :tenantId', { tenantId: machine.tenantId })
      .andWhere('stop.machine = :machine', { machine: machine.machineId })
      .andWhere('(stop.endFailure IS NULL OR stop.endFailure >= :since)', {
        since,
      })
      .getMany();
    const busy: Interval[] = existing.map((s) => ({
      start: s.startFailure.getTime(),
      end: (s.endFailure ?? now).getTime(),
    }));

    const stops = generateForMachine(machine, shifts, days, now, busy);
    await stopRepo.save(
      stops.map((s) => stopRepo.create(s)),
      { chunk: 500 },
    );
    total += stops.length;

    const downtime = stops
      .filter((s) => s.reason !== 'planned')
      .reduce(
        (sum, s) =>
          sum +
          ((s.endFailure as Date).getTime() - s.startFailure.getTime()) / 60000,
        0,
      );
    console.log(
      `  • ${machine.machineId}: ${stops.length} przestojów, ${Math.round(downtime / 60)} h nieplanowanych`,
    );
  }

  console.log(
    `✅ Zapisano ${total} historycznych przestojów dla ${machines.length} maszyn (ostatnie ${days} dni)`,
  );
  await app.close();
}

void bootstrap();
