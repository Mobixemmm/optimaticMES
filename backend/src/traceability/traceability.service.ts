import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { tenantScope } from '../common/request-context';
import { MaterialConsumption } from '../entities/material-consumption.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { QualityDefect } from '../entities/quality-defect.entity';
import { OperatorSession } from '../entities/operator-session.entity';
import { Operator } from '../entities/operator.entity';
import { DEFECT_LABELS } from '../quality/quality.service';

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

@Injectable()
export class TraceabilityService {
  constructor(
    @InjectRepository(MaterialConsumption)
    private consumptionRepository: Repository<MaterialConsumption>,
    @InjectRepository(InventoryItem)
    private inventoryRepository: Repository<InventoryItem>,
    @InjectRepository(ProductionOrder)
    private orderRepository: Repository<ProductionOrder>,
    @InjectRepository(QualityDefect)
    private defectRepository: Repository<QualityDefect>,
    @InjectRepository(OperatorSession)
    private sessionRepository: Repository<OperatorSession>,
    @InjectRepository(Operator)
    private operatorRepository: Repository<Operator>,
  ) {}

  /**
   * Paszport wyrobu: wszystko, co wiadomo o jednym zleceniu.
   *
   * Materiały i wady wiszą na zleceniu twardym kluczem obcym. Operatorzy —
   * NIE: OperatorSession nie ma orderId, więc jedyne, co da się zrobić, to
   * pokazać sesje pokrywające się czasem ze zleceniem. To jest poszlaka, nie
   * dowód, i odpowiedź jawnie to oznacza (`operatorsAreInferred`), żeby nikt
   * nie wziął tej listy za rejestrację obsady.
   */
  async traceOrder(orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, ...tenantScope() },
    });
    if (!order) {
      throw new NotFoundException(`Zlecenie o ID ${orderId} nie istnieje`);
    }

    const consumptions = await this.consumptionRepository.find({
      where: { orderId, ...tenantScope() },
      order: { consumedAt: 'ASC' },
    });
    const materialIds = [...new Set(consumptions.map((c) => c.inventoryItemId))];
    const materials =
      materialIds.length > 0
        ? await this.inventoryRepository.find({
            where: { id: In(materialIds), ...tenantScope() },
          })
        : [];
    const materialById = new Map(materials.map((m) => [m.id, m]));

    const defects = await this.defectRepository.find({
      where: { orderId, ...tenantScope() },
      order: { detectedAt: 'ASC' },
    });

    const operators = await this.operatorsOverlappingOrder(order);

    return {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        productName: order.productName,
        quantity: order.quantity,
        producedQuantity: order.producedQuantity,
        scrapQuantity: order.scrapQuantity,
        status: order.status,
        actualStart: order.actualStart,
        actualEnd: order.actualEnd,
      },
      materials: consumptions.map((c) => {
        const material = materialById.get(c.inventoryItemId);
        return {
          id: c.id,
          inventoryItemId: c.inventoryItemId,
          code: material?.code ?? '—',
          name: material?.name ?? '—',
          unit: material?.unit ?? '',
          batchNumber: c.batchNumber,
          quantity: num(c.quantity),
          consumedAt: c.consumedAt,
          consumedBy: c.consumedBy,
        };
      }),
      defects: defects.map((d) => ({
        id: d.id,
        defectCode: d.defectCode,
        label: DEFECT_LABELS[d.defectCode] ?? d.defectCode,
        quantity: d.quantity,
        status: d.status,
        machineId: d.machineId,
        detectedAt: d.detectedAt,
        detectedBy: d.detectedBy,
      })),
      // Maszyny znamy tylko z kart wad — zlecenie nie ma pola z maszyną,
      // więc nie zmyślamy tu pełnej listy stanowisk.
      machines: [...new Set(defects.map((d) => d.machineId).filter((m): m is string => !!m))],
      operators,
      operatorsAreInferred: true,
    };
  }

  /**
   * Ścieżka wycofania: która partia surowca trafiła do których zleceń.
   * To jest pytanie zadawane, gdy dostawca zgłosi wadę materiału — odpowiedź
   * musi wskazać wszystkie dotknięte zlecenia, nie przybliżenie.
   */
  async traceBatch(batchNumber: string) {
    const consumptions = await this.consumptionRepository.find({
      where: { batchNumber, ...tenantScope() },
      order: { consumedAt: 'ASC' },
    });

    if (consumptions.length === 0) {
      return { batchNumber, found: false, totalQuantity: 0, affectedOrders: [] };
    }

    const orderIds = [...new Set(consumptions.map((c) => c.orderId))];
    const orders = await this.orderRepository.find({
      where: { id: In(orderIds), ...tenantScope() },
    });
    const orderById = new Map(orders.map((o) => [o.id, o]));

    const materialIds = [...new Set(consumptions.map((c) => c.inventoryItemId))];
    const materials = await this.inventoryRepository.find({
      where: { id: In(materialIds), ...tenantScope() },
    });
    const materialById = new Map(materials.map((m) => [m.id, m]));

    // Ile braków ma każde dotknięte zlecenie — pozwala od razu ocenić, czy
    // wadliwa partia zdążyła się odbić na jakości.
    const defects = await this.defectRepository.find({
      where: { orderId: In(orderIds), ...tenantScope() },
    });
    const defectQtyByOrder = new Map<number, number>();
    for (const defect of defects) {
      if (defect.status !== 'scrapped') continue;
      defectQtyByOrder.set(
        defect.orderId,
        (defectQtyByOrder.get(defect.orderId) ?? 0) + defect.quantity,
      );
    }

    const affectedOrders = orderIds.map((orderId) => {
      const order = orderById.get(orderId);
      const rows = consumptions.filter((c) => c.orderId === orderId);
      return {
        orderId,
        orderNumber: order?.orderNumber ?? `#${orderId}`,
        productName: order?.productName ?? '—',
        status: order?.status ?? null,
        producedQuantity: order?.producedQuantity ?? 0,
        scrapQuantity: defectQtyByOrder.get(orderId) ?? 0,
        consumedQuantity: rows.reduce((sum, r) => sum + num(r.quantity), 0),
        firstConsumedAt: rows[0]?.consumedAt ?? null,
      };
    });

    const material = materialById.get(consumptions[0].inventoryItemId);

    return {
      batchNumber,
      found: true,
      material: material
        ? { code: material.code, name: material.name, unit: material.unit }
        : null,
      totalQuantity: consumptions.reduce((sum, c) => sum + num(c.quantity), 0),
      affectedOrders,
    };
  }

  /** Podpowiedzi do wyszukiwarki partii. */
  async listBatches(): Promise<{ batchNumber: string; orderCount: number }[]> {
    const consumptions = await this.consumptionRepository.find({
      where: tenantScope(),
    });
    const orders = new Map<string, Set<number>>();
    for (const c of consumptions) {
      if (!orders.has(c.batchNumber)) orders.set(c.batchNumber, new Set());
      orders.get(c.batchNumber)!.add(c.orderId);
    }
    return [...orders.entries()]
      .map(([batchNumber, orderIds]) => ({ batchNumber, orderCount: orderIds.size }))
      .sort((a, b) => a.batchNumber.localeCompare(b.batchNumber, 'pl'));
  }

  private async operatorsOverlappingOrder(order: ProductionOrder) {
    if (!order.actualStart) return [];
    const windowEnd = order.actualEnd ?? new Date();

    // Sesja pokrywa się ze zleceniem, gdy zaczęła się przed jego końcem i nie
    // skończyła przed jego początkiem (sesja otwarta = trwa do teraz).
    const sessions = await this.sessionRepository.find({
      where: [
        {
          ...tenantScope(),
          loginTime: LessThanOrEqual(windowEnd),
          logoutTime: MoreThan(order.actualStart),
        },
        {
          ...tenantScope(),
          loginTime: LessThanOrEqual(windowEnd),
          logoutTime: IsNull(),
        },
      ],
    });
    if (sessions.length === 0) return [];

    const operatorIds = [...new Set(sessions.map((s) => s.operatorId))];
    const operators = await this.operatorRepository.find({
      where: { id: In(operatorIds), ...tenantScope() },
    });
    const operatorById = new Map(operators.map((o) => [o.id, o]));

    return sessions.map((session) => {
      const operator = operatorById.get(session.operatorId);
      return {
        sessionId: session.id,
        operatorId: session.operatorId,
        name: operator ? `${operator.firstName} ${operator.lastName}` : `#${session.operatorId}`,
        loginTime: session.loginTime,
        logoutTime: session.logoutTime,
      };
    });
  }
}
