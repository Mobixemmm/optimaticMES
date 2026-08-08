import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductionOrder } from '../entities/production-order.entity';
import { MachineStopEvent, StopReason } from '../entities/machine-stop-event.entity';
import { MachinesService } from '../machines/machines.service';
import { ShiftsService } from '../shifts/shifts.service';
import { currentTenantId } from '../common/request-context';
import { REASON_LABELS } from '../machine-stops/machine-stops.service';

// Dane faktowe do pulpitu analitycznego — celowo NIE zagregowane.
//
// /analytics/summary liczy wszystko na serwerze i zwraca gotowe liczby. To jest
// dobre do kafelków, ale uniemożliwia filtrowanie krzyżowe: kliknięcie słupka
// "Awaria" musiałoby przeliczyć każdy inny wizual, czyli odpytać serwer po
// każdym kliknięciu. Tutaj wysyłamy raz surowe zdarzenia w oknie czasu, a
// przekroje liczy przeglądarka — dzięki temu filtr działa natychmiast.
//
// Skala jest tu świadomym założeniem: przy zakładzie liczącym dziesiątki maszyn
// okno 90 dni to rzędy tysięcy przestojów, czyli setki kilobajtów JSON-a. Gdyby
// klient urósł o rząd wielkości, ten endpoint trzeba zamienić na agregaty
// serwerowe (Timescale continuous aggregates) i filtrowanie po stronie API.
const MAX_DAYS = 90;

export interface DatasetStop {
  id: number;
  machineId: string;
  reason: StopReason;
  reasonLabel: string;
  startTime: string;
  endTime: string | null;
  minutes: number;
  notes: string | null;
}

export interface DatasetMachine {
  machineId: string;
  name: string;
  line: string | null;
  siteId: number | null;
  areaId: number | null;
  targetOeePct: number | null;
}

export interface DatasetOrder {
  id: number;
  orderNumber: string;
  productName: string;
  status: ProductionOrder['status'];
  quantity: number;
  producedQuantity: number;
  scrapQuantity: number;
  idealCycleTimeSec: number | null;
  actualStart: string | null;
  actualEnd: string | null;
}

@Injectable()
export class AnalyticsDatasetService {
  constructor(
    @InjectRepository(ProductionOrder)
    private readonly orderRepository: Repository<ProductionOrder>,
    @InjectRepository(MachineStopEvent)
    private readonly stopRepository: Repository<MachineStopEvent>,
    private readonly machinesService: MachinesService,
    private readonly shiftsService: ShiftsService,
  ) {}

  async getDataset(days: number) {
    const boundedDays = Math.min(MAX_DAYS, Math.max(1, days));
    const now = new Date();
    const from = new Date(now.getTime() - boundedDays * 24 * 60 * 60 * 1000);

    const machines = await this.machinesService.findAllActive();

    const stopRows = await this.stopRepository
      .createQueryBuilder('stop')
      .where('stop.tenantId = :tenantId', { tenantId: currentTenantId() })
      // Nawias obowiązkowy: bez niego AND/OR rozpadłoby się tak, że otwarte
      // przestoje innych klientów trafiłyby do wyniku.
      .andWhere('(stop.startFailure >= :from OR stop.endFailure IS NULL)', { from })
      .orderBy('stop.startFailure', 'DESC')
      .getMany();

    // Kontrakt datasetu (machineId/startTime/endTime) celowo NIE idzie za zmianą
    // nazw w bazie — to osobna warstwa prezentacyjna, na której wiszą wykresy.
    // Zmiana schematu tabeli kończy się na tym mapowaniu.
    const stops: DatasetStop[] = stopRows.map((stop) => ({
      id: stop.id,
      machineId: stop.machine,
      reason: stop.reason,
      reasonLabel: REASON_LABELS[stop.reason] ?? stop.reason,
      startTime: stop.startFailure.toISOString(),
      endTime: stop.endFailure ? stop.endFailure.toISOString() : null,
      // Przestój otwarty liczymy do teraz — tak samo jak getSummary(), żeby
      // kafelki i wykresy nie pokazywały dwóch różnych prawd.
      minutes: Math.max(
        0,
        ((stop.endFailure ?? now).getTime() - stop.startFailure.getTime()) / 60000,
      ),
      notes: stop.notes,
    }));

    const orderRows = await this.orderRepository.find({
      where: { tenantId: currentTenantId() },
      order: { createdAt: 'DESC' },
    });
    const orders: DatasetOrder[] = orderRows.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      productName: order.productName,
      status: order.status,
      quantity: order.quantity,
      producedQuantity: order.producedQuantity,
      scrapQuantity: order.scrapQuantity,
      idealCycleTimeSec:
        order.idealCycleTimeSec === null ? null : Number(order.idealCycleTimeSec),
      actualStart: order.actualStart ? order.actualStart.toISOString() : null,
      actualEnd: order.actualEnd ? order.actualEnd.toISOString() : null,
    }));

    // Czas planowany z kalendarza zmian, dzień po dniu — klient potrzebuje go
    // per dzień, bo po zafiltrowaniu zakresu dat musi przeliczyć dostępność
    // tylko dla wybranych dni.
    const plannedMinutesByDay: { date: string; minutesPerMachine: number }[] = [];
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= now) {
      plannedMinutesByDay.push({
        date: toDateKey(cursor),
        minutesPerMachine: await this.shiftsService.plannedMinutesForDay(cursor),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      range: {
        from: from.toISOString(),
        to: now.toISOString(),
        days: boundedDays,
      },
      machines: machines.map(
        (m): DatasetMachine => ({
          machineId: m.machineId,
          name: m.name,
          line: m.line,
          siteId: m.siteId,
          areaId: m.areaId,
          targetOeePct: m.targetOeePct === null ? null : Number(m.targetOeePct),
        }),
      ),
      stops,
      orders,
      plannedMinutesByDay,
    };
  }
}

// Klucz dnia w czasie LOKALNYM, nie UTC — inaczej przestój z 23:30 wpadłby
// w wykresie do następnej doby i zmiana nocna raportowałaby się o dzień za późno.
function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
