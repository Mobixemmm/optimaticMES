import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { tenantScope } from '../common/request-context';
import { ProductionOrder } from '../entities/production-order.entity';
import { Machine } from '../entities/machine.entity';
import { MachinesService } from '../machines/machines.service';
import { ShiftsService } from '../shifts/shifts.service';
import { AssignOrderDto, ReorderQueueDto } from './dto/assign-order.dto';

// Zlecenia zamknięte nie zajmują już stanowiska — plan dotyczy wyłącznie tego,
// co dopiero ma się wydarzyć albo właśnie trwa.
const OPEN_STATUSES = ['pending', 'in_progress'];

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface PlannedOrderRow {
  id: number;
  orderNumber: string;
  productName: string;
  quantity: number;
  producedQuantity: number;
  remainingQuantity: number;
  status: string;
  sequence: number | null;
  plannedStart: Date | null;
  // null = nie da się oszacować, bo ani zlecenie, ani maszyna nie mają czasu cyklu.
  workMinutes: number | null;
}

@Injectable()
export class PlanningService {
  constructor(
    @InjectRepository(ProductionOrder)
    private orderRepository: Repository<ProductionOrder>,
    private machinesService: MachinesService,
    private shiftsService: ShiftsService,
  ) {}

  /**
   * Tablica planowania: maszyny jako wiersze, przypisane zlecenia w kolejności,
   * obok pracochłonność zestawiona ze zdolnością wynikającą z kalendarza zmian.
   *
   * Pracochłonność liczymy z ilości POZOSTAŁEJ do wykonania, nie z całego
   * zlecenia — zlecenie zrobione w 90% nie blokuje już maszyny na osiem godzin.
   */
  async board(days = 7) {
    if (days < 1 || days > 90) {
      throw new BadRequestException('Zakres planowania musi mieścić się w 1–90 dniach');
    }

    const machines = await this.machinesService.findAllActive();
    const orders = await this.orderRepository.find({
      where: { status: In(OPEN_STATUSES), ...tenantScope() },
      order: { sequence: 'ASC', id: 'ASC' },
    });

    const now = new Date();
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    // Kalendarz zmian jest wspólny dla zakładu, więc zdolność jednej maszyny
    // liczymy raz i stosujemy do wszystkich.
    const capacityMinutes = await this.shiftsService.plannedMinutesForRange(now, until);

    const rows = machines.map((machine) => {
      const assigned = orders
        .filter((order) => order.machineId === machine.machineId)
        .map((order) => this.toRow(order, machine));

      const estimable = assigned.filter((o) => o.workMinutes !== null);
      const workMinutes = estimable.reduce((sum, o) => sum + (o.workMinutes ?? 0), 0);

      return {
        machineId: machine.machineId,
        name: machine.name,
        line: machine.line,
        orders: assigned,
        workMinutes: Math.round(workMinutes),
        capacityMinutes: Math.round(capacityMinutes),
        loadPct: capacityMinutes > 0 ? round1((workMinutes / capacityMinutes) * 100) : 0,
        overloaded: capacityMinutes > 0 && workMinutes > capacityMinutes,
        // Ile zleceń nie da się wycenić czasowo — bez tego "obciążenie 40%"
        // wyglądałoby wiarygodnie także wtedy, gdy połowa kolejki jest nieznana.
        ordersWithoutEstimate: assigned.length - estimable.length,
      };
    });

    const unassigned = orders
      .filter((order) => !order.machineId)
      .map((order) => this.toRow(order, null));

    return {
      days,
      from: now,
      until,
      capacityMinutesPerMachine: Math.round(capacityMinutes),
      machines: rows,
      unassigned,
    };
  }

  async assign(orderId: number, dto: AssignOrderDto): Promise<ProductionOrder> {
    const order = await this.findOrder(orderId);

    if (dto.machineId === null || dto.machineId === '') {
      order.machineId = null;
      order.sequence = null;
    } else if (dto.machineId !== undefined) {
      const machine = await this.machinesService.findByMachineId(dto.machineId);
      if (!machine) {
        throw new NotFoundException(`Maszyna „${dto.machineId}" nie istnieje w kartotece`);
      }
      if (!machine.isActive) {
        throw new BadRequestException(
          `Maszyna „${machine.name}" jest nieaktywna i nie można na nią planować`,
        );
      }
      const changingMachine = order.machineId !== dto.machineId;
      order.machineId = dto.machineId;
      // Przeniesienie na inną maszynę bez podanej pozycji dokleja zlecenie na
      // koniec nowej kolejki, zamiast zostawić pozycję z poprzedniej.
      if (dto.sequence === undefined && changingMachine) {
        order.sequence = await this.nextSequence(dto.machineId);
      }
    }

    if (dto.sequence !== undefined) {
      order.sequence = dto.sequence;
    }
    if (dto.plannedStart !== undefined) {
      order.plannedStart = new Date(dto.plannedStart);
    }

    return this.orderRepository.save(order);
  }

  /** Ustawia kolejność całej kolejki maszyny jednym ruchem (przeciąganie w UI). */
  async reorder(dto: ReorderQueueDto): Promise<{ updated: number }> {
    const orders = await this.orderRepository.find({
      where: { id: In(dto.orderIds), ...tenantScope() },
    });
    if (orders.length !== dto.orderIds.length) {
      throw new NotFoundException(
        'Część wskazanych zleceń nie istnieje lub należy do innego klienta',
      );
    }
    const foreign = orders.filter((o) => o.machineId !== dto.machineId);
    if (foreign.length > 0) {
      throw new BadRequestException(
        `Zlecenia ${foreign.map((o) => o.orderNumber).join(', ')} nie są przypisane do maszyny ${dto.machineId}`,
      );
    }

    const positionById = new Map(dto.orderIds.map((id, index) => [id, index]));
    for (const order of orders) {
      order.sequence = positionById.get(order.id) ?? order.sequence;
    }
    await this.orderRepository.save(orders);
    return { updated: orders.length };
  }

  private async findOrder(id: number): Promise<ProductionOrder> {
    const order = await this.orderRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!order) {
      throw new NotFoundException(`Zlecenie o ID ${id} nie istnieje`);
    }
    if (!OPEN_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Zlecenie ${order.orderNumber} jest zamknięte i nie podlega planowaniu`,
      );
    }
    return order;
  }

  private async nextSequence(machineId: string): Promise<number> {
    const last = await this.orderRepository.findOne({
      where: { machineId, sequence: Not(IsNull()), ...tenantScope() },
      order: { sequence: 'DESC' },
    });
    return last?.sequence != null ? last.sequence + 1 : 0;
  }

  private toRow(order: ProductionOrder, machine: Machine | null): PlannedOrderRow {
    const remainingQuantity = Math.max(
      0,
      (order.quantity ?? 0) - (order.producedQuantity ?? 0),
    );

    // Czas cyklu ze zlecenia ma pierwszeństwo; norma maszyny jest zapasem.
    // Gdy nie ma żadnego, zwracamy null zamiast zera — brak danych to nie
    // to samo co zerowa pracochłonność.
    const cycleSec =
      order.idealCycleTimeSec != null && num(order.idealCycleTimeSec) > 0
        ? num(order.idealCycleTimeSec)
        : machine?.defaultIdealCycleTimeSec != null &&
            num(machine.defaultIdealCycleTimeSec) > 0
          ? num(machine.defaultIdealCycleTimeSec)
          : null;

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      productName: order.productName,
      quantity: order.quantity,
      producedQuantity: order.producedQuantity,
      remainingQuantity,
      status: order.status,
      sequence: order.sequence,
      plannedStart: order.plannedStart,
      workMinutes: cycleSec !== null ? round1((remainingQuantity * cycleSec) / 60) : null,
    };
  }
}
