import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { ProductionOrder } from '../entities/production-order.entity';
import { Operator } from '../entities/operator.entity';
import { OperatorSession } from '../entities/operator-session.entity';
import { MaintenanceTask } from '../entities/maintenance-task.entity';
import { AndonAlert } from '../entities/andon-alert.entity';
import { MachineStopEvent } from '../entities/machine-stop-event.entity';
import { MachinesService } from '../machines/machines.service';
import { ShiftsService } from '../shifts/shifts.service';
import { enterTestRequestContext } from '../common/testing/request-context.testing';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function order(overrides: Partial<ProductionOrder>): ProductionOrder {
  return {
    id: 1,
    tenantId: 1,
    orderNumber: 'WO-1',
    productName: 'Widget',
    quantity: 100,
    producedQuantity: 0,
    scrapQuantity: 0,
    idealCycleTimeSec: null,
    status: 'in_progress',
    plannedStart: null,
    actualStart: new Date(),
    actualEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let orderRepo: MockRepo<ProductionOrder>;
  let andonRepo: MockRepo<AndonAlert>;
  let maintenanceRepo: MockRepo<MaintenanceTask>;
  let sessionRepo: MockRepo<OperatorSession>;
  let operatorRepo: MockRepo<Operator>;
  let machinesService: { findAllActive: jest.Mock };
  let shiftsService: {
    findAll: jest.Mock;
    plannedMinutesForRange: jest.Mock;
    plannedMinutesForDay: jest.Mock;
  };
  let stopQueryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    orWhere: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(async () => {
    enterTestRequestContext();
    stopQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    const stopRepo: MockRepo<MachineStopEvent> = {
      createQueryBuilder: jest.fn(() => stopQueryBuilder),
    };

    orderRepo = { find: jest.fn().mockResolvedValue([]) };
    andonRepo = {
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([]),
    };
    maintenanceRepo = { count: jest.fn().mockResolvedValue(0) };
    sessionRepo = { count: jest.fn().mockResolvedValue(0) };
    operatorRepo = { find: jest.fn().mockResolvedValue([]) };

    machinesService = {
      findAllActive: jest.fn().mockResolvedValue([{ machineId: 'M1', name: 'Frezarka M1' }]),
    };
    shiftsService = {
      findAll: jest.fn().mockResolvedValue([]),
      // 8h/day planned per machine so operatingMinutes math is easy to reason about
      plannedMinutesForRange: jest.fn().mockResolvedValue(8 * 60),
      plannedMinutesForDay: jest.fn().mockResolvedValue(8 * 60),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(ProductionOrder), useValue: orderRepo },
        { provide: getRepositoryToken(Operator), useValue: operatorRepo },
        { provide: getRepositoryToken(OperatorSession), useValue: sessionRepo },
        { provide: getRepositoryToken(MaintenanceTask), useValue: maintenanceRepo },
        { provide: getRepositoryToken(AndonAlert), useValue: andonRepo },
        { provide: getRepositoryToken(MachineStopEvent), useValue: stopRepo },
        { provide: MachinesService, useValue: machinesService },
        { provide: ShiftsService, useValue: shiftsService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('falls back to the quantity-ratio performance method when no order has an ideal cycle time', async () => {
    (orderRepo.find as jest.Mock).mockResolvedValue([
      order({ quantity: 100, producedQuantity: 50, idealCycleTimeSec: null }),
    ]);

    const summary = await service.getSummary(30);

    expect(summary.oee.performanceMethod).toBe('quantity_ratio');
    expect(summary.oee.performance).toBe(50); // 50/100 = 50%
  });

  it('switches to the cycle-time performance method once an order declares idealCycleTimeSec', async () => {
    // 1 machine, 8h planned per machine (480 min = 28800s), no downtime -> operatingMinutes = 480
    // idealCycleTimeSec=10s * producedQuantity=1440 = 14400s -> performance = 14400/28800 = 50%
    (orderRepo.find as jest.Mock).mockResolvedValue([
      order({ quantity: 2000, producedQuantity: 1440, idealCycleTimeSec: 10 }),
    ]);

    const summary = await service.getSummary(30);

    expect(summary.oee.performanceMethod).toBe('cycle_time');
    expect(summary.oee.performance).toBe(50);
  });

  it('computes quality from produced vs. scrap quantities', async () => {
    (orderRepo.find as jest.Mock).mockResolvedValue([
      order({ producedQuantity: 100, scrapQuantity: 10 }),
    ]);

    const summary = await service.getSummary(30);

    expect(summary.oee.quality).toBe(90);
    expect(summary.production).toEqual({ produced: 100, scrap: 10, good: 90 });
  });

  it('defaults quality to 100% when nothing has been produced yet', async () => {
    (orderRepo.find as jest.Mock).mockResolvedValue([order({ producedQuantity: 0 })]);

    const summary = await service.getSummary(30);

    expect(summary.oee.quality).toBe(100);
  });

  it('reports full availability when there is no downtime', async () => {
    stopQueryBuilder.getMany.mockResolvedValue([]);

    const summary = await service.getSummary(30);

    expect(summary.oee.availability).toBe(100);
  });
});
