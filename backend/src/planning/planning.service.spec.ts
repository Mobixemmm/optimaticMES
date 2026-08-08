import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { PlanningService } from './planning.service';
import { ProductionOrder } from '../entities/production-order.entity';
import { Machine } from '../entities/machine.entity';
import { MachinesService } from '../machines/machines.service';
import { ShiftsService } from '../shifts/shifts.service';
import { enterTestRequestContext } from '../common/testing/request-context.testing';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function order(overrides: Partial<ProductionOrder> = {}): ProductionOrder {
  return {
    id: 1,
    tenantId: 1,
    orderNumber: 'WO-1',
    productName: 'Obudowa',
    quantity: 100,
    producedQuantity: 0,
    scrapQuantity: 0,
    idealCycleTimeSec: null,
    status: 'pending',
    machineId: 'PRESS-01',
    sequence: 0,
    plannedStart: null,
    actualStart: null,
    actualEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ProductionOrder;
}

function machine(overrides: Partial<Machine> = {}): Machine {
  return {
    id: 1,
    tenantId: 1,
    machineId: 'PRESS-01',
    name: 'Prasa 1',
    siteId: null,
    areaId: null,
    line: 'Linia A',
    targetOeePct: null,
    defaultIdealCycleTimeSec: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Machine;
}

describe('PlanningService', () => {
  let service: PlanningService;
  let orderRepo: MockRepo<ProductionOrder>;
  let machinesService: { findAllActive: jest.Mock; findByMachineId: jest.Mock };
  let shiftsService: { plannedMinutesForRange: jest.Mock };

  beforeEach(async () => {
    enterTestRequestContext();

    orderRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(order()),
      save: jest.fn((d) => Promise.resolve(d)),
    };
    machinesService = {
      findAllActive: jest.fn().mockResolvedValue([machine()]),
      findByMachineId: jest.fn().mockResolvedValue(machine()),
    };
    // 7 dni po 8 h zmiany = 3360 minut zdolności na maszynę.
    shiftsService = { plannedMinutesForRange: jest.fn().mockResolvedValue(3360) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanningService,
        { provide: getRepositoryToken(ProductionOrder), useValue: orderRepo },
        { provide: MachinesService, useValue: machinesService },
        { provide: ShiftsService, useValue: shiftsService },
      ],
    }).compile();

    service = module.get<PlanningService>(PlanningService);
  });

  describe('board', () => {
    it('liczy pracochłonność z czasu cyklu zlecenia', async () => {
      orderRepo.find!.mockResolvedValue([order({ quantity: 120, idealCycleTimeSec: 30 })]);

      const result = await service.board(7);

      // 120 szt. × 30 s = 3600 s = 60 min
      expect(result.machines[0].orders[0].workMinutes).toBe(60);
      expect(result.machines[0].workMinutes).toBe(60);
    });

    it('używa normy maszyny, gdy zlecenie nie ma własnego czasu cyklu', async () => {
      machinesService.findAllActive.mockResolvedValue([
        machine({ defaultIdealCycleTimeSec: 60 }),
      ]);
      orderRepo.find!.mockResolvedValue([order({ quantity: 10, idealCycleTimeSec: null })]);

      const result = await service.board(7);

      expect(result.machines[0].orders[0].workMinutes).toBe(10);
    });

    it('liczy z ilości pozostałej, nie z całego zlecenia', async () => {
      orderRepo.find!.mockResolvedValue([
        order({ quantity: 100, producedQuantity: 90, idealCycleTimeSec: 60 }),
      ]);

      const result = await service.board(7);

      // Zostało 10 szt., nie 100 — zlecenie na ukończeniu nie blokuje maszyny.
      expect(result.machines[0].orders[0].remainingQuantity).toBe(10);
      expect(result.machines[0].orders[0].workMinutes).toBe(10);
    });

    it('nie zgaduje pracochłonności bez czasu cyklu i sygnalizuje to osobno', async () => {
      orderRepo.find!.mockResolvedValue([order({ idealCycleTimeSec: null })]);

      const result = await service.board(7);

      // null, nie 0 — brak danych to nie to samo co zerowa pracochłonność.
      expect(result.machines[0].orders[0].workMinutes).toBeNull();
      expect(result.machines[0].workMinutes).toBe(0);
      expect(result.machines[0].ordersWithoutEstimate).toBe(1);
    });

    it('oznacza przeciążenie, gdy praca przekracza zdolność', async () => {
      shiftsService.plannedMinutesForRange.mockResolvedValue(60);
      orderRepo.find!.mockResolvedValue([order({ quantity: 200, idealCycleTimeSec: 60 })]);

      const result = await service.board(7);

      expect(result.machines[0].workMinutes).toBe(200);
      expect(result.machines[0].overloaded).toBe(true);
      expect(result.machines[0].loadPct).toBeCloseTo(333.3, 1);
    });

    it('zlecenia bez maszyny trafiają do puli nierozplanowanych', async () => {
      orderRepo.find!.mockResolvedValue([
        order({ id: 5, machineId: null, sequence: null }),
      ]);

      const result = await service.board(7);

      expect(result.machines[0].orders).toHaveLength(0);
      expect(result.unassigned).toHaveLength(1);
      expect(result.unassigned[0].id).toBe(5);
    });

    it('odrzuca absurdalny horyzont planowania', async () => {
      await expect(service.board(500)).rejects.toThrow(BadRequestException);
    });
  });

  describe('assign', () => {
    it('dokleja zlecenie na koniec kolejki nowej maszyny', async () => {
      orderRepo.findOne!
        .mockResolvedValueOnce(order({ machineId: 'PRESS-01', sequence: 0 }))
        .mockResolvedValueOnce(order({ sequence: 4 }));
      machinesService.findByMachineId.mockResolvedValue(machine({ machineId: 'PRESS-02' }));

      const saved = await service.assign(1, { machineId: 'PRESS-02' });

      expect(saved.machineId).toBe('PRESS-02');
      expect(saved.sequence).toBe(5);
    });

    it('null zdejmuje zlecenie z planu razem z pozycją w kolejce', async () => {
      const saved = await service.assign(1, { machineId: null });

      expect(saved.machineId).toBeNull();
      expect(saved.sequence).toBeNull();
    });

    it('odrzuca maszynę spoza kartoteki', async () => {
      machinesService.findByMachineId.mockResolvedValue(null);

      await expect(service.assign(1, { machineId: 'NIE-MA' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nie pozwala planować na maszynę nieaktywną', async () => {
      machinesService.findByMachineId.mockResolvedValue(machine({ isActive: false }));

      await expect(service.assign(1, { machineId: 'PRESS-01' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('nie pozwala planować zlecenia zamkniętego', async () => {
      orderRepo.findOne!.mockResolvedValue(order({ status: 'completed' }));

      await expect(service.assign(1, { machineId: 'PRESS-01' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reorder', () => {
    it('nadaje pozycje zgodnie z przysłaną kolejnością', async () => {
      orderRepo.find!.mockResolvedValue([
        order({ id: 3, sequence: 0 }),
        order({ id: 8, sequence: 1 }),
        order({ id: 12, sequence: 2 }),
      ]);

      await service.reorder({ machineId: 'PRESS-01', orderIds: [12, 3, 8] });

      const saved = orderRepo.save!.mock.calls[0][0] as ProductionOrder[];
      expect(saved.find((o) => o.id === 12)?.sequence).toBe(0);
      expect(saved.find((o) => o.id === 3)?.sequence).toBe(1);
      expect(saved.find((o) => o.id === 8)?.sequence).toBe(2);
    });

    it('odrzuca zlecenie przypisane do innej maszyny', async () => {
      orderRepo.find!.mockResolvedValue([order({ id: 3, machineId: 'PRESS-09' })]);

      await expect(
        service.reorder({ machineId: 'PRESS-01', orderIds: [3] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('odrzuca listę zawierającą nieistniejące zlecenie', async () => {
      orderRepo.find!.mockResolvedValue([order({ id: 3 })]);

      await expect(
        service.reorder({ machineId: 'PRESS-01', orderIds: [3, 999] }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
