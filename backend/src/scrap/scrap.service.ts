import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, Repository } from 'typeorm';
import { ScrapEvent } from '../entities/scrap-event.entity';
import { ScrapCategory } from '../entities/scrap-category.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { currentTenantId, tenantScope } from '../common/request-context';
import { MachineConfigsService } from '../machine-configs/machine-configs.service';
import { MachineDataService } from '../machine-data/machine-data.service';
import {
  CreateScrapCategoryDto,
  UpdateScrapCategoryDto,
} from './dto/scrap-category.dto';
import { ReclassifyScrapDto, ReportScrapDto } from './dto/report-scrap.dto';

export interface ScrapSummary {
  days: number;
  totalQuantity: number;
  fromOperator: number;
  fromTelemetry: number;
  unclassifiedQuantity: number;
  byCategory: {
    code: string;
    label: string;
    group: string | null;
    quantity: number;
    pct: number;
  }[];
  byMachine: { machineId: string; quantity: number }[];
}

// Ile próbek licznika bierzemy na jeden przebieg importu. Zabezpiecza przed
// sytuacją, w której po tygodniu przerwy w imporcie jedno żądanie próbuje
// przemielić milion wierszy — reszta doczyta się przy kolejnym wywołaniu.
const TELEMETRY_BATCH = 1000;

@Injectable()
export class ScrapService {
  private readonly logger = new Logger(ScrapService.name);

  constructor(
    @InjectRepository(ScrapEvent)
    private readonly scrapRepository: Repository<ScrapEvent>,
    @InjectRepository(ScrapCategory)
    private readonly categoryRepository: Repository<ScrapCategory>,
    @InjectRepository(ProductionOrder)
    private readonly orderRepository: Repository<ProductionOrder>,
    private readonly machineConfigs: MachineConfigsService,
    private readonly machineData: MachineDataService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // --- Katalog kategorii ---------------------------------------------------

  async listCategories(includeInactive = false): Promise<ScrapCategory[]> {
    return this.categoryRepository.find({
      where: includeInactive ? tenantScope() : { isActive: true, ...tenantScope() },
      order: { sortOrder: 'ASC', label: 'ASC' },
    });
  }

  async createCategory(dto: CreateScrapCategoryDto): Promise<ScrapCategory> {
    const existing = await this.categoryRepository.findOne({
      where: { code: dto.code, ...tenantScope() },
    });
    if (existing) {
      throw new BadRequestException(`Kategoria o kodzie ${dto.code} już istnieje`);
    }
    return this.categoryRepository.save(
      this.categoryRepository.create({
        ...dto,
        group: dto.group ?? null,
        tenantId: currentTenantId(),
      }),
    );
  }

  async updateCategory(
    id: number,
    dto: UpdateScrapCategoryDto,
  ): Promise<ScrapCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!category) {
      throw new NotFoundException(`Kategoria odrzutu ${id} nie istnieje`);
    }
    Object.assign(category, dto);
    return this.categoryRepository.save(category);
  }

  // --- Zgłoszenie z przycisku operatora ------------------------------------

  /**
   * Odrzut zgłoszony ręcznie z panelu przy maszynie.
   *
   * Zgłoszenie przechodzi tylko wtedy, gdy maszyna ma operatora jako źródło
   * odrzutu. Na maszynie liczącej wyłącznie z czujnika ręczne dopisywanie
   * podwajałoby braki — a to jest błąd, którego nikt nie zauważy w liczbach,
   * dopóki nie zacznie się szukać, czemu jakość spadła.
   */
  async report(dto: ReportScrapDto): Promise<ScrapEvent> {
    const config = await this.machineConfigs.getForMachine(dto.machineId);
    if (config.scrapSource === 'telemetry') {
      throw new BadRequestException(
        `Maszyna "${config.name}" liczy odrzut z czujnika — ręczne zgłoszenie podwoiłoby braki. ` +
          'Zmień źródło odrzutu na "operator" albo "oba" w konfiguracji maszyny.',
      );
    }

    await this.assertCategoryExists(dto.categoryCode);

    const orderId = dto.orderId ?? (await this.findOpenOrderId(dto.machineId));
    const recordedAt = new Date();

    const event = await this.scrapRepository.save(
      this.scrapRepository.create({
        tenantId: currentTenantId(),
        machineId: dto.machineId,
        orderId,
        categoryCode: dto.categoryCode,
        quantity: String(dto.quantity),
        source: 'operator',
        operatorId: dto.operatorId ?? null,
        notes: dto.notes ?? null,
        recordedAt,
      }),
    );

    await this.addToOrderScrap(orderId, dto.quantity);
    return event;
  }

  /**
   * Nadanie przyczyny odrzutowi, który przyszedł z czujnika bez kategorii.
   * To jest druga połowa „kategoryzacji": licznik zna liczbę, człowiek — powód.
   */
  async reclassify(id: number, dto: ReclassifyScrapDto): Promise<ScrapEvent> {
    const event = await this.scrapRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!event) {
      throw new NotFoundException(`Zgłoszenie odrzutu ${id} nie istnieje`);
    }
    await this.assertCategoryExists(dto.categoryCode);

    event.categoryCode = dto.categoryCode;
    if (dto.notes !== undefined) event.notes = dto.notes;
    return this.scrapRepository.save(event);
  }

  async remove(id: number): Promise<void> {
    const event = await this.scrapRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!event) {
      throw new NotFoundException(`Zgłoszenie odrzutu ${id} nie istnieje`);
    }
    // Odjęcie od zlecenia, żeby skasowanie pomyłki nie zostawiło zawyżonego
    // licznika braków na zleceniu.
    await this.addToOrderScrap(event.orderId, -Number(event.quantity));
    await this.scrapRepository.remove(event);
  }

  // --- Import z logów maszyny ----------------------------------------------

  /**
   * Zamienia narastający licznik odrzutu z telemetrii na zdarzenia.
   *
   * Jest idempotentna dzięki kursorowi w machine_configs: powtórne wywołanie
   * nie zaimportuje tych samych próbek drugi raz. Dlatego wolno ją wołać i przy
   * odczycie listy, i z zewnętrznego crona — nie potrzebujemy w projekcie
   * schedulera tylko po to, żeby ten import ruszał.
   */
  async ingestFromTelemetry(): Promise<{ machines: number; events: number }> {
    const machines = await this.machineConfigs.machinesWithTelemetryScrap();
    let events = 0;

    for (const config of machines) {
      try {
        events += await this.ingestMachine(config);
      } catch (err) {
        // Jedna maszyna z popsutym tagiem nie może zatrzymać importu z pozostałych.
        this.logger.warn(
          `Import odrzutu z telemetrii dla ${config.machineId} nie powiódł się: ${(err as Error).message}`,
        );
      }
    }
    return { machines: machines.length, events };
  }

  private async ingestMachine(config: {
    machineId: string;
    scrapTag: string;
    scrapDefaultCategory: string;
  }): Promise<number> {
    // Import odpala się przy każdym odczycie /scrap/events i /scrap/summary,
    // więc dwie karty przeglądarki (albo karta + cron) wchodzą tu równolegle.
    // Bez blokady oba przebiegi czytały ten sam kursor i każdy zapisywał te
    // same przyrosty — odrzut i licznik braków zlecenia rosły N-krotnie.
    // Blokada doradcza per (tenant, maszyna) zwalnia się sama z końcem
    // transakcji; drugi przebieg czeka, a potem widzi już przesunięty kursor.
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        ['scrap-ingest', `${currentTenantId()}:${config.machineId}`],
      );
      return this.ingestMachineLocked(config, manager);
    });
  }

  private async ingestMachineLocked(
    config: {
      machineId: string;
      scrapTag: string;
      scrapDefaultCategory: string;
    },
    manager: EntityManager,
  ): Promise<number> {
    const scrapRepository = manager.getRepository(ScrapEvent);
    const cursor = await this.machineConfigs.readScrapCursor(
      config.machineId,
      manager,
    );
    const samples = await this.machineData.findByTagSince(
      config.machineId,
      config.scrapTag,
      cursor.at,
      TELEMETRY_BATCH,
    );
    if (samples.length === 0) return 0;

    let previous = cursor.value;
    let created = 0;
    let lastValue = previous;
    let lastTime: Date | null = null;

    for (const sample of samples) {
      const value = sample.value_num;
      if (value === null || Number.isNaN(value)) continue;

      lastTime = sample.time;
      lastValue = value;

      // Pierwsza próbka po włączeniu importu ustawia punkt odniesienia. Bez
      // tego stan licznika sprzed wdrożenia wjechałby jako jeden gigantyczny
      // odrzut w dniu uruchomienia.
      if (previous === null) {
        previous = value;
        continue;
      }

      // Licznik potrafi wrócić do zera: restart sterownika albo przewinięcie
      // zakresu. Wtedy przyrostem jest cała nowa wartość, a nie liczba ujemna.
      const delta = value >= previous ? value - previous : value;
      previous = value;
      if (delta <= 0) continue;

      const orderId = await this.findOpenOrderId(config.machineId);
      await scrapRepository.save(
        scrapRepository.create({
          tenantId: currentTenantId(),
          machineId: config.machineId,
          orderId,
          // Czujnik nie zna przyczyny — zdarzenie czeka na kategoryzację
          // człowieka, zamiast udawać, że przyczyna jest znana.
          categoryCode: config.scrapDefaultCategory,
          quantity: String(delta),
          source: 'telemetry',
          operatorId: null,
          notes: null,
          recordedAt: sample.time,
        }),
      );
      await this.addToOrderScrap(orderId, delta, manager);
      created += 1;
    }

    if (lastTime !== null && lastValue !== null) {
      await this.machineConfigs.writeScrapCursor(
        config.machineId,
        lastValue,
        lastTime,
        manager,
      );
    }
    return created;
  }

  // --- Odczyt --------------------------------------------------------------

  async list(days = 30, machineId?: string): Promise<ScrapEvent[]> {
    const from = this.daysAgo(days);
    return this.scrapRepository.find({
      where: {
        ...tenantScope(),
        recordedAt: Between(from, new Date()),
        ...(machineId ? { machineId } : {}),
      },
      order: { recordedAt: 'DESC' },
      take: 500,
    });
  }

  async summary(days = 30): Promise<ScrapSummary> {
    const [events, categories] = await Promise.all([
      this.scrapRepository.find({
        where: { ...tenantScope(), recordedAt: Between(this.daysAgo(days), new Date()) },
      }),
      this.listCategories(true),
    ]);

    const labelOf = new Map(categories.map((c) => [c.code, c]));
    const total = events.reduce((sum, e) => sum + Number(e.quantity), 0);

    const perCategory = new Map<string, number>();
    const perMachine = new Map<string, number>();
    let fromOperator = 0;
    let fromTelemetry = 0;
    let unclassified = 0;

    for (const event of events) {
      const quantity = Number(event.quantity);
      const code = event.categoryCode ?? 'UNCLASSIFIED';
      perCategory.set(code, (perCategory.get(code) ?? 0) + quantity);
      perMachine.set(event.machineId, (perMachine.get(event.machineId) ?? 0) + quantity);
      if (event.source === 'operator') fromOperator += quantity;
      else fromTelemetry += quantity;
      if (code === 'UNCLASSIFIED') unclassified += quantity;
    }

    return {
      days,
      totalQuantity: total,
      fromOperator,
      fromTelemetry,
      unclassifiedQuantity: unclassified,
      byCategory: [...perCategory.entries()]
        .map(([code, quantity]) => ({
          code,
          label: labelOf.get(code)?.label ?? code,
          group: labelOf.get(code)?.group ?? null,
          quantity,
          pct: total > 0 ? Math.round((quantity / total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.quantity - a.quantity),
      byMachine: [...perMachine.entries()]
        .map(([machineId, quantity]) => ({ machineId, quantity }))
        .sort((a, b) => b.quantity - a.quantity),
    };
  }

  // --- Wewnętrzne ----------------------------------------------------------

  private daysAgo(days: number): Date {
    const from = new Date();
    from.setDate(from.getDate() - days);
    return from;
  }

  private async assertCategoryExists(code: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { code, ...tenantScope() },
    });
    if (!category) {
      throw new BadRequestException(`Nieznana kategoria odrzutu: ${code}`);
    }
    if (!category.isActive) {
      throw new BadRequestException(
        `Kategoria "${category.label}" jest wycofana i nie można jej już wybrać`,
      );
    }
  }

  // Zlecenie, w które wpada odrzut z tej maszyny. Bez otwartego zlecenia
  // zdarzenie zostaje bez powiązania — dopisanie go do zamkniętego zlecenia
  // psułoby jego rozliczenie po fakcie.
  private async findOpenOrderId(machineId: string): Promise<number | null> {
    const order = await this.orderRepository.findOne({
      where: { machineId, status: 'in_progress', ...tenantScope() },
      order: { actualStart: 'DESC' },
      select: { id: true },
    });
    return order?.id ?? null;
  }

  private async addToOrderScrap(
    orderId: number | null,
    delta: number,
    manager?: EntityManager,
  ): Promise<void> {
    if (orderId === null || delta === 0) return;

    // Licznik braków na zleceniu zasila wskaźnik Jakości w OEE, więc musi
    // rosnąć razem ze zgłoszeniami — inaczej moduł SCRAP i analityka
    // pokazywałyby dwie różne prawdy o tej samej zmianie.
    //
    // Atomowy UPDATE zamiast odczyt → +delta → zapis: dwa zgłoszenia z
    // różnych paneli w tej samej chwili nadpisywały sobie nawzajem wynik.
    const repository = manager?.getRepository(ProductionOrder) ?? this.orderRepository;
    await repository
      .createQueryBuilder()
      .update(ProductionOrder)
      .set({ scrapQuantity: () => 'GREATEST(0, "scrapQuantity" + :delta)' })
      .where('id = :orderId AND tenant_id = :tenantId', {
        orderId,
        tenantId: currentTenantId(),
      })
      .setParameter('delta', Math.round(delta))
      .execute();
  }
}
