import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ScrapService } from './scrap.service';
import { ScrapEvent } from '../entities/scrap-event.entity';
import { ScrapCategory } from '../entities/scrap-category.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { MachineConfigsService } from '../machine-configs/machine-configs.service';
import { MachineDataService } from '../machine-data/machine-data.service';
import { enterTestRequestContext } from '../common/testing/request-context.testing';

// Łańcuch QueryBuildera dla atomowego UPDATE licznika braków zlecenia.
function createUpdateBuilder() {
  const builder = {
    update: jest.fn(),
    set: jest.fn(),
    where: jest.fn(),
    setParameter: jest.fn(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  builder.update.mockReturnValue(builder);
  builder.set.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.setParameter.mockReturnValue(builder);
  return builder;
}

function sample(time: string, value: number | null) {
  return {
    time: new Date(time),
    machine_id: 'PRESS-01',
    tag_name: 'scrap_count',
    value_num: value,
    value_bool: null,
    value_text: null,
  };
}

describe('ScrapService', () => {
  let service: ScrapService;
  let scrapRepo: { save: jest.Mock; create: jest.Mock; find: jest.Mock; findOne: jest.Mock; remove: jest.Mock };
  let categoryRepo: { findOne: jest.Mock; find: jest.Mock; save: jest.Mock; create: jest.Mock };
  let orderRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let updateBuilder: ReturnType<typeof createUpdateBuilder>;
  let manager: { query: jest.Mock; getRepository: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let machineConfigs: {
    getForMachine: jest.Mock;
    machinesWithTelemetryScrap: jest.Mock;
    readScrapCursor: jest.Mock;
    writeScrapCursor: jest.Mock;
  };
  let machineData: { findByTagSince: jest.Mock };

  const activeCategory = { id: 1, code: 'MATERIAL', label: 'Wada materiału', isActive: true };

  beforeEach(async () => {
    enterTestRequestContext();

    scrapRepo = {
      save: jest.fn((row: unknown) => Promise.resolve(row)),
      create: jest.fn((data: unknown) => ({ ...(data as object) })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    categoryRepo = {
      findOne: jest.fn().mockResolvedValue(activeCategory),
      find: jest.fn().mockResolvedValue([activeCategory]),
      save: jest.fn((row: unknown) => Promise.resolve(row)),
      create: jest.fn((data: unknown) => ({ ...(data as object) })),
    };
    updateBuilder = createUpdateBuilder();
    orderRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((row: unknown) => Promise.resolve(row)),
      createQueryBuilder: jest.fn(() => updateBuilder),
    };
    // Transakcja w testach wykonuje callback od razu na menedżerze, który
    // oddaje te same mocki repozytoriów co wstrzyknięte do serwisu.
    manager = {
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn((entity: unknown) =>
        entity === ScrapEvent
          ? scrapRepo
          : entity === ProductionOrder
            ? orderRepo
            : {},
      ),
    };
    dataSource = {
      transaction: jest.fn(
        (work: (m: typeof manager) => Promise<unknown>) => work(manager),
      ),
    };
    machineConfigs = {
      getForMachine: jest.fn().mockResolvedValue({
        machineId: 'PRESS-01',
        name: 'Prasa 1',
        scrapSource: 'operator',
        scrapTag: 'scrap_count',
        scrapDefaultCategory: 'UNCLASSIFIED',
      }),
      machinesWithTelemetryScrap: jest.fn().mockResolvedValue([]),
      readScrapCursor: jest.fn().mockResolvedValue({ value: null, at: null }),
      writeScrapCursor: jest.fn().mockResolvedValue(undefined),
    };
    machineData = { findByTagSince: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScrapService,
        { provide: getRepositoryToken(ScrapEvent), useValue: scrapRepo },
        { provide: getRepositoryToken(ScrapCategory), useValue: categoryRepo },
        { provide: getRepositoryToken(ProductionOrder), useValue: orderRepo },
        { provide: MachineConfigsService, useValue: machineConfigs },
        { provide: MachineDataService, useValue: machineData },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = module.get<ScrapService>(ScrapService);
  });

  describe('zgłoszenie operatora', () => {
    it('zapisuje zdarzenie ze źródłem operator', async () => {
      const event = await service.report({
        machineId: 'PRESS-01',
        quantity: 3,
        categoryCode: 'MATERIAL',
      });

      expect(event).toEqual(
        expect.objectContaining({
          machineId: 'PRESS-01',
          quantity: '3',
          source: 'operator',
          categoryCode: 'MATERIAL',
        }),
      );
    });

    it('odmawia zgłoszenia na maszynie liczącej wyłącznie z czujnika', async () => {
      machineConfigs.getForMachine.mockResolvedValue({
        machineId: 'PRESS-01',
        name: 'Prasa 1',
        scrapSource: 'telemetry',
        scrapTag: 'scrap_count',
        scrapDefaultCategory: 'UNCLASSIFIED',
      });

      await expect(
        service.report({ machineId: 'PRESS-01', quantity: 1, categoryCode: 'MATERIAL' }),
      ).rejects.toThrow(BadRequestException);
      expect(scrapRepo.save).not.toHaveBeenCalled();
    });

    it('dopisuje braki do otwartego zlecenia atomowym UPDATE', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 42 });

      await service.report({ machineId: 'PRESS-01', quantity: 3, categoryCode: 'MATERIAL' });

      // Bez odczyt → +delta → zapis: dwa równoległe zgłoszenia gubiły wtedy
      // jedno z nich. Licznik zmienia sama baza.
      expect(orderRepo.save).not.toHaveBeenCalled();
      expect(updateBuilder.where).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ orderId: 42 }),
      );
      expect(updateBuilder.setParameter).toHaveBeenCalledWith('delta', 3);
      expect(updateBuilder.execute).toHaveBeenCalled();
    });

    it('odrzuca nieznaną kategorię', async () => {
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.report({ machineId: 'PRESS-01', quantity: 1, categoryCode: 'NIE_MA' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('odrzuca kategorię wycofaną', async () => {
      categoryRepo.findOne.mockResolvedValue({ ...activeCategory, isActive: false });

      await expect(
        service.report({ machineId: 'PRESS-01', quantity: 1, categoryCode: 'MATERIAL' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('import z telemetrii', () => {
    const telemetryMachine = {
      machineId: 'PRESS-01',
      scrapTag: 'scrap_count',
      scrapDefaultCategory: 'UNCLASSIFIED',
    };

    beforeEach(() => {
      machineConfigs.machinesWithTelemetryScrap.mockResolvedValue([telemetryMachine]);
    });

    it('pierwsza próbka ustawia punkt odniesienia i nie tworzy zdarzenia', async () => {
      machineData.findByTagSince.mockResolvedValue([sample('2026-08-01T10:00:00Z', 500)]);

      const result = await service.ingestFromTelemetry();

      expect(result.events).toBe(0);
      expect(scrapRepo.save).not.toHaveBeenCalled();
      // Kursor i tak się zapisuje — inaczej ten sam stan licznika byłby
      // punktem odniesienia w kółko, przy każdym przebiegu.
      expect(machineConfigs.writeScrapCursor).toHaveBeenCalledWith(
        'PRESS-01',
        500,
        new Date('2026-08-01T10:00:00Z'),
        manager,
      );
    });

    it('importuje każdą maszynę w transakcji pod blokadą doradczą', async () => {
      machineData.findByTagSince.mockResolvedValue([sample('2026-08-01T10:00:00Z', 500)]);

      await service.ingestFromTelemetry();

      // Równoległe odczyty /scrap/events dublowały zdarzenia — blokada per
      // (tenant, maszyna) szereguje przebiegi, a kursor czytany jest w tej
      // samej transakcji, w której jest przesuwany.
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('pg_advisory_xact_lock'),
        ['scrap-ingest', expect.stringContaining('PRESS-01')],
      );
      expect(machineConfigs.readScrapCursor).toHaveBeenCalledWith('PRESS-01', manager);
    });

    it('zamienia przyrosty licznika na zdarzenia', async () => {
      machineConfigs.readScrapCursor.mockResolvedValue({
        value: 100,
        at: new Date('2026-08-01T09:00:00Z'),
      });
      machineData.findByTagSince.mockResolvedValue([
        sample('2026-08-01T10:00:00Z', 102),
        sample('2026-08-01T10:05:00Z', 105),
      ]);

      const result = await service.ingestFromTelemetry();

      expect(result.events).toBe(2);
      expect(scrapRepo.save).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ quantity: '2', source: 'telemetry' }),
      );
      expect(scrapRepo.save).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ quantity: '3', source: 'telemetry' }),
      );
    });

    it('traktuje spadek licznika jak restart sterownika, a nie ujemny odrzut', async () => {
      machineConfigs.readScrapCursor.mockResolvedValue({
        value: 900,
        at: new Date('2026-08-01T09:00:00Z'),
      });
      machineData.findByTagSince.mockResolvedValue([sample('2026-08-01T10:00:00Z', 4)]);

      const result = await service.ingestFromTelemetry();

      expect(result.events).toBe(1);
      expect(scrapRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: '4' }),
      );
    });

    it('pomija próbki bez wartości liczbowej i brak przyrostu', async () => {
      machineConfigs.readScrapCursor.mockResolvedValue({
        value: 10,
        at: new Date('2026-08-01T09:00:00Z'),
      });
      machineData.findByTagSince.mockResolvedValue([
        sample('2026-08-01T10:00:00Z', null),
        sample('2026-08-01T10:01:00Z', 10),
      ]);

      const result = await service.ingestFromTelemetry();

      expect(result.events).toBe(0);
      expect(scrapRepo.save).not.toHaveBeenCalled();
    });

    it('nadaje zdarzeniu z czujnika kategorię domyślną i znacznik czasu próbki', async () => {
      machineConfigs.readScrapCursor.mockResolvedValue({
        value: 0,
        at: new Date('2026-08-01T09:00:00Z'),
      });
      machineData.findByTagSince.mockResolvedValue([sample('2026-08-01T10:00:00Z', 7)]);

      await service.ingestFromTelemetry();

      expect(scrapRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryCode: 'UNCLASSIFIED',
          recordedAt: new Date('2026-08-01T10:00:00Z'),
          operatorId: null,
        }),
      );
    });

    it('awaria jednej maszyny nie zatrzymuje importu z pozostałych', async () => {
      machineConfigs.machinesWithTelemetryScrap.mockResolvedValue([
        { ...telemetryMachine, machineId: 'BROKEN' },
        telemetryMachine,
      ]);
      machineData.findByTagSince
        .mockRejectedValueOnce(new Error('tag nie istnieje'))
        .mockResolvedValueOnce([sample('2026-08-01T10:00:00Z', 5)]);

      const result = await service.ingestFromTelemetry();

      expect(result.machines).toBe(2);
      expect(machineData.findByTagSince).toHaveBeenCalledTimes(2);
    });
  });

  describe('podsumowanie', () => {
    it('rozdziela odrzut na źródła i liczy udział kategorii', async () => {
      scrapRepo.find.mockResolvedValue([
        { machineId: 'PRESS-01', categoryCode: 'MATERIAL', quantity: '6', source: 'operator' },
        { machineId: 'PRESS-01', categoryCode: 'UNCLASSIFIED', quantity: '2', source: 'telemetry' },
        { machineId: 'SAW-02', categoryCode: 'MATERIAL', quantity: '2', source: 'operator' },
      ]);

      const summary = await service.summary(30);

      expect(summary.totalQuantity).toBe(10);
      expect(summary.fromOperator).toBe(8);
      expect(summary.fromTelemetry).toBe(2);
      expect(summary.unclassifiedQuantity).toBe(2);
      expect(summary.byCategory[0]).toEqual(
        expect.objectContaining({ code: 'MATERIAL', quantity: 8, pct: 80 }),
      );
      expect(summary.byMachine[0]).toEqual({ machineId: 'PRESS-01', quantity: 8 });
    });
  });
});
