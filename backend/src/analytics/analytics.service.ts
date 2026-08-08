import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { tenantScope, currentTenantId } from '../common/request-context';
import { ProductionOrder } from '../entities/production-order.entity';
import { Operator } from '../entities/operator.entity';
import { OperatorSession } from '../entities/operator-session.entity';
import { MaintenanceTask } from '../entities/maintenance-task.entity';
import { AndonAlert } from '../entities/andon-alert.entity';
import { MachineStopEvent, StopReason } from '../entities/machine-stop-event.entity';
import { MachinesService } from '../machines/machines.service';
import { ShiftsService } from '../shifts/shifts.service';
import { Shift } from '../entities/shift.entity';
import { REASON_LABELS } from '../machine-stops/machine-stops.service';

// Fallback gdy w danym momencie żadna zmiana z kalendarza nie pasuje
// (np. brak zdefiniowanego harmonogramu) — nie blokuje działania widżetu.
const SHIFT_LENGTH_HOURS_FALLBACK = 8;
const DAILY_CHART_DAYS = 14;
const LOSS_REASONS: StopReason[] = [
  'failure',
  'setup',
  'material',
  'micro_stop',
  'quality',
];

function minutesBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / 60000);
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function toMinutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Zmiana pokrywająca `nowMinutes` danego dnia tygodnia (obsługuje zmiany przez północ)
function findCurrentShift(shifts: Shift[], dayOfWeek: number, nowMinutes: number): Shift | undefined {
  return shifts.find((s) => {
    if (!s.isActive || s.dayOfWeek !== dayOfWeek) return false;
    const start = toMinutesOfDay(s.startTime);
    const end = toMinutesOfDay(s.endTime);
    return end > start
      ? nowMinutes >= start && nowMinutes < end
      : nowMinutes >= start || nowMinutes < end;
  });
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ProductionOrder)
    private orderRepository: Repository<ProductionOrder>,
    @InjectRepository(Operator)
    private operatorRepository: Repository<Operator>,
    @InjectRepository(OperatorSession)
    private sessionRepository: Repository<OperatorSession>,
    @InjectRepository(MaintenanceTask)
    private maintenanceRepository: Repository<MaintenanceTask>,
    @InjectRepository(AndonAlert)
    private andonRepository: Repository<AndonAlert>,
    @InjectRepository(MachineStopEvent)
    private stopRepository: Repository<MachineStopEvent>,
    private machinesService: MachinesService,
    private shiftsService: ShiftsService,
  ) {}

  async getSummary(days = 30) {
    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const chartStart = new Date(
      now.getTime() - DAILY_CHART_DAYS * 24 * 60 * 60 * 1000,
    );
    const fetchSince = periodStart < chartStart ? chartStart : periodStart;

    const machines = await this.machinesService.findAllActive();
    const machineIds = machines.map((m) => m.machineId);
    const machineNames = new Map(machines.map((m) => [m.machineId, m.name]));
    const shiftsList = await this.shiftsService.findAll();

    const stops = await this.stopRepository
      .createQueryBuilder('stop')
      .where('stop.tenantId = :tenantId', { tenantId: currentTenantId() })
      // Nawias jest tu konieczny: AND wiąże mocniej niż OR, więc bez niego
      // warunek rozpadłby się na "(tenant AND startFailure>=X) OR endFailure IS NULL"
      // i wciągnął otwarte przestoje WSZYSTKICH klientów.
      .andWhere('(stop.startFailure >= :fetchSince OR stop.endFailure IS NULL)', {
        fetchSince,
      })
      .getMany();

    const stopsInPeriod = stops.filter((s) => s.startFailure >= periodStart);
    const downtimeStops = stopsInPeriod.filter((s) => s.reason !== 'planned');

    const totalDowntimeMinutes = downtimeStops.reduce(
      (sum, s) => sum + minutesBetween(s.startFailure, s.endFailure ?? now),
      0,
    );
    const machineCount = Math.max(1, machineIds.length);
    // Planowany czas pracy wg kalendarza zmian (nie zakłada już pracy 24/7) —
    // patrz ShiftsService.plannedMinutesForRange.
    const plannedMinutesPerMachine = await this.shiftsService.plannedMinutesForRange(
      periodStart,
      now,
    );
    const plannedMinutes = Math.max(1, machineCount * plannedMinutesPerMachine);
    const availability = clamp01(1 - totalDowntimeMinutes / plannedMinutes);
    const operatingMinutes = Math.max(0, plannedMinutes - totalDowntimeMinutes);

    // --- Zlecenia produkcyjne w oknie analizy ---
    const orders = await this.orderRepository.find({ where: tenantScope() });
    const ordersInPeriod = orders.filter(
      (o) => o.actualStart && o.actualStart >= periodStart,
    );
    const relevantOrders = ordersInPeriod.length > 0 ? ordersInPeriod : orders;

    const sumQuantity = relevantOrders.reduce((s, o) => s + (o.quantity || 0), 0);
    const sumProduced = relevantOrders.reduce(
      (s, o) => s + (o.producedQuantity || 0),
      0,
    );
    const sumScrap = relevantOrders.reduce((s, o) => s + (o.scrapQuantity || 0), 0);

    // Performance "właściwe" wg definicji OEE: (czas cyklu wzorcowego × ilość) / czas pracy.
    // Wymaga, żeby przynajmniej część zleceń miała ustawiony idealCycleTimeSec — inaczej
    // spadamy do przybliżenia "wykonane/zaplanowane" i jawnie to sygnalizujemy w odpowiedzi.
    const ordersWithCycleTime = relevantOrders.filter(
      (o) => o.idealCycleTimeSec != null && Number(o.idealCycleTimeSec) > 0,
    );
    const idealTimeSeconds = ordersWithCycleTime.reduce(
      (s, o) => s + Number(o.idealCycleTimeSec) * (o.producedQuantity || 0),
      0,
    );
    let performance: number;
    let performanceMethod: 'cycle_time' | 'quantity_ratio';
    if (ordersWithCycleTime.length > 0 && operatingMinutes > 0) {
      performance = clamp01(idealTimeSeconds / (operatingMinutes * 60));
      performanceMethod = 'cycle_time';
    } else {
      performance = sumQuantity > 0 ? clamp01(sumProduced / sumQuantity) : 0;
      performanceMethod = 'quantity_ratio';
    }
    const quality = sumProduced > 0 ? clamp01(1 - sumScrap / sumProduced) : 1;
    const overall = availability * performance * quality;

    // --- MTTR / MTBF (na bazie awarii w oknie analizy) ---
    const failureStopsClosed = downtimeStops.filter(
      (s) => s.reason === 'failure' && s.endFailure,
    );
    const mttrMinutes =
      failureStopsClosed.length > 0
        ? failureStopsClosed.reduce(
            (s, e) => s + minutesBetween(e.startFailure, e.endFailure as Date),
            0,
          ) / failureStopsClosed.length
        : null;

    const gapsHours: number[] = [];
    for (const machineId of machineIds) {
      const starts = downtimeStops
        .filter((s) => s.machine === machineId && s.reason === 'failure')
        .map((s) => s.startFailure.getTime())
        .sort((a, b) => a - b);
      for (let i = 1; i < starts.length; i++) {
        gapsHours.push((starts[i] - starts[i - 1]) / 3600000);
      }
    }
    const mtbfHours =
      gapsHours.length > 0
        ? gapsHours.reduce((s, g) => s + g, 0) / gapsHours.length
        : null;

    // --- Przyczyny strat (udział czasu przestoju wg powodu) ---
    const lossReasons = LOSS_REASONS.map((reason) => {
      const minutes = downtimeStops
        .filter((s) => s.reason === reason)
        .reduce((s, e) => s + minutesBetween(e.startFailure, e.endFailure ?? now), 0);
      return {
        reason,
        label: REASON_LABELS[reason],
        pct:
          totalDowntimeMinutes > 0
            ? Math.round((minutes / totalDowntimeMinutes) * 1000) / 10
            : 0,
      };
    }).sort((a, b) => b.pct - a.pct);

    // --- Dostępność dzień po dniu (ostatnie 14 dni) ---
    const dailyAvailability: { date: string; pct: number }[] = [];
    for (let i = DAILY_CHART_DAYS - 1; i >= 0; i--) {
      const dayStart = startOfDay(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayDowntime = stops
        .filter((s) => s.reason !== 'planned')
        .reduce((sum, s) => {
          const overlapStart = s.startFailure > dayStart ? s.startFailure : dayStart;
          const overlapEndRaw = s.endFailure ?? now;
          const overlapEnd = overlapEndRaw < dayEnd ? overlapEndRaw : dayEnd;
          return sum + minutesBetween(overlapStart, overlapEnd);
        }, 0);
      const dayPlannedMinutesPerMachine = await this.shiftsService.plannedMinutesForDay(
        dayStart,
        shiftsList,
      );
      const dayPlannedMinutes = Math.max(1, machineCount * dayPlannedMinutesPerMachine);
      dailyAvailability.push({
        date: dayStart.toISOString().slice(0, 10),
        pct:
          Math.round(clamp01(1 - dayDowntime / dayPlannedMinutes) * 1000) / 10,
      });
    }

    // --- Postęp zmiany (dzisiejsze zlecenia) ---
    const todayStart = startOfDay(now);
    const todaysOrders = orders.filter(
      (o) =>
        (o.actualStart && o.actualStart >= todayStart) ||
        o.status === 'in_progress',
    );
    const shiftPlanned = todaysOrders.reduce((s, o) => s + (o.quantity || 0), 0);
    const shiftProduced = todaysOrders.reduce(
      (s, o) => s + (o.producedQuantity || 0),
      0,
    );

    // Realny postęp bieżącej zmiany z kalendarza; jeśli żadna zmiana nie
    // obejmuje teraz (przerwa międzyzmianowa, brak harmonogramu) — przybliżenie
    // na bazie startu pierwszego dzisiejszego zlecenia.
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const currentShift = findCurrentShift(shiftsList, now.getDay(), nowMinutes);
    let elapsedMinutes: number;
    let remainingMinutes: number;
    if (currentShift) {
      const startM = toMinutesOfDay(currentShift.startTime);
      const endM = toMinutesOfDay(currentShift.endTime);
      const totalShiftMinutes = endM > startM ? endM - startM : 1440 - startM + endM;
      elapsedMinutes = nowMinutes >= startM ? nowMinutes - startM : 1440 - startM + nowMinutes;
      remainingMinutes = Math.max(0, totalShiftMinutes - elapsedMinutes);
    } else {
      const earliestStart = todaysOrders
        .map((o) => o.actualStart)
        .filter((d): d is Date => !!d)
        .sort((a, b) => a.getTime() - b.getTime())[0];
      elapsedMinutes = earliestStart ? minutesBetween(earliestStart, now) : 0;
      remainingMinutes = Math.max(0, SHIFT_LENGTH_HOURS_FALLBACK * 60 - elapsedMinutes);
    }

    // --- Stan maszyn ---
    const todayPlannedMinutes = await this.shiftsService.plannedMinutesForDay(
      now,
      shiftsList,
    );
    const machinesStatus = machineIds.map((machineId) => {
      const activeStop = stops.find(
        (s) => s.machine === machineId && s.endFailure === null,
      );
      const machineDowntime = stops
        .filter((s) => s.machine === machineId && s.reason !== 'planned')
        .reduce(
          (sum, s) => sum + minutesBetween(s.startFailure, s.endFailure ?? now),
          0,
        );
      // Gdy dziś nie ma zaplanowanej pracy (np. niedziela bez zmian), fallback do 24h,
      // żeby uniknąć dzielenia przez zero i sztucznego 100%.
      const denom = todayPlannedMinutes > 0 ? todayPlannedMinutes : 24 * 60;
      return {
        machineId,
        name: machineNames.get(machineId) ?? machineId,
        state: activeStop ? REASON_LABELS[activeStop.reason] : 'Praca',
        reason: activeStop?.reason ?? null,
        oeeApprox: Math.round(clamp01(1 - machineDowntime / denom) * 1000) / 10,
      };
    });

    // --- Andon ---
    const activeAndonCount = await this.andonRepository.count({
      where: { isResolved: false, ...tenantScope() },
    });
    const recentAndon = await this.andonRepository.find({
      where: tenantScope(),
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // --- Utrzymanie ruchu ---
    const openMaintenanceCount = await this.maintenanceRepository.count({
      where: { status: Not('done'), ...tenantScope() },
    });
    const criticalMaintenanceCount = await this.maintenanceRepository.count({
      where: { status: Not('done'), priority: 'critical', ...tenantScope() },
    });

    // --- Operatorzy ---
    const onShiftCount = await this.sessionRepository.count({
      where: { isActive: true, ...tenantScope() },
    });
    const operators = await this.operatorRepository.find({ where: tenantScope() });
    const withEfficiency = operators.filter((o) => o.efficiencyPct != null);
    const avgEfficiency =
      withEfficiency.length > 0
        ? Math.round(
            (withEfficiency.reduce((s, o) => s + Number(o.efficiencyPct), 0) /
              withEfficiency.length) *
              10,
          ) / 10
        : null;

    return {
      production: {
        produced: sumProduced,
        scrap: sumScrap,
        good: Math.max(0, sumProduced - sumScrap),
      },
      oee: {
        availability: Math.round(availability * 1000) / 10,
        performance: Math.round(performance * 1000) / 10,
        quality: Math.round(quality * 1000) / 10,
        overall: Math.round(overall * 1000) / 10,
        performanceMethod,
      },
      mttrMinutes: mttrMinutes !== null ? Math.round(mttrMinutes) : null,
      mtbfHours: mtbfHours !== null ? Math.round(mtbfHours * 10) / 10 : null,
      lossReasons,
      dailyAvailability,
      shift: {
        planned: shiftPlanned,
        produced: shiftProduced,
        pct:
          shiftPlanned > 0
            ? Math.round((shiftProduced / shiftPlanned) * 1000) / 10
            : 0,
        remainingMinutes: Math.round(remainingMinutes),
      },
      machinesStatus,
      andon: {
        activeCount: activeAndonCount,
        recent: recentAndon,
      },
      maintenance: {
        openCount: openMaintenanceCount,
        criticalCount: criticalMaintenanceCount,
      },
      operators: {
        onShiftCount,
        avgEfficiency,
      },
    };
  }
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.min(1, Math.max(0, v));
}
