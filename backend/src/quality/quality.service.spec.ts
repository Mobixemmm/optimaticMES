import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { QualityService } from './quality.service';
import { QualityDefect } from '../entities/quality-defect.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import {
  enterTestRequestContext,
  TEST_TENANT_ID,
} from '../common/testing/request-context.testing';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function defect(overrides: Partial<QualityDefect> = {}): QualityDefect {
  return {
    id: 1,
    tenantId: TEST_TENANT_ID,
    orderId: 10,
    machineId: 'PRESS-01',
    defectCode: 'surface',
    quantity: 3,
    disposition: 'scrap',
    status: 'scrapped',
    detectedBy: null,
    detectedAt: new Date(),
    resolvedAt: new Date(),
    notes: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('QualityService', () => {
  let service: QualityService;
  let defectRepo: MockRepo<QualityDefect>;
  let orderRepo: MockRepo<ProductionOrder>;
  let queryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(async () => {
    enterTestRequestContext();

    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    defectRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      create: jest.fn((data) => data as QualityDefect),
      save: jest.fn((data) => Promise.resolve({ id: 1, ...data })),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };

    orderRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 10, tenantId: TEST_TENANT_ID }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QualityService,
        { provide: getRepositoryToken(QualityDefect), useValue: defectRepo },
        { provide: getRepositoryToken(ProductionOrder), useValue: orderRepo },
      ],
    }).compile();

    service = module.get<QualityService>(QualityService);
  });

  describe('create', () => {
    it('zamyka brak od razu i dolicza go do braków na zleceniu', async () => {
      defectRepo.find!.mockResolvedValue([defect({ quantity: 3 })]);

      const created = await service.create({
        orderId: 10,
        defectCode: 'surface',
        quantity: 3,
        disposition: 'scrap',
      });

      expect(created.status).toBe('scrapped');
      expect(created.resolvedAt).not.toBeNull();
      expect(orderRepo.update).toHaveBeenCalledWith(
        { id: 10, tenantId: TEST_TENANT_ID },
        { scrapQuantity: 3 },
      );
    });

    it('zostawia poprawkę otwartą i nie liczy jej jeszcze jako braku', async () => {
      defectRepo.find!.mockResolvedValue([
        defect({ disposition: 'rework', status: 'open', quantity: 5 }),
      ]);

      const created = await service.create({
        orderId: 10,
        defectCode: 'assembly',
        quantity: 5,
        disposition: 'rework',
      });

      expect(created.status).toBe('open');
      expect(created.resolvedAt).toBeNull();
      expect(orderRepo.update).toHaveBeenCalledWith(
        { id: 10, tenantId: TEST_TENANT_ID },
        { scrapQuantity: 0 },
      );
    });

    it('odrzuca kartę wady wskazującą na nieistniejące zlecenie', async () => {
      orderRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.create({
          orderId: 999,
          defectCode: 'other',
          quantity: 1,
          disposition: 'scrap',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolve', () => {
    it('udana poprawka nie obciąża braków', async () => {
      defectRepo.findOne!.mockResolvedValue(
        defect({ disposition: 'rework', status: 'open', quantity: 4, resolvedAt: null }),
      );
      defectRepo.find!.mockResolvedValue([
        defect({ disposition: 'rework', status: 'reworked', quantity: 4 }),
      ]);

      const resolved = await service.resolve(1, { outcome: 'reworked' });

      expect(resolved.status).toBe('reworked');
      expect(orderRepo.update).toHaveBeenCalledWith(
        { id: 10, tenantId: TEST_TENANT_ID },
        { scrapQuantity: 0 },
      );
    });

    it('nieudana poprawka wpada do braków zlecenia', async () => {
      defectRepo.findOne!.mockResolvedValue(
        defect({ disposition: 'rework', status: 'open', quantity: 4, resolvedAt: null }),
      );
      defectRepo.find!.mockResolvedValue([
        defect({ disposition: 'rework', status: 'scrapped', quantity: 4 }),
      ]);

      await service.resolve(1, { outcome: 'scrapped' });

      expect(orderRepo.update).toHaveBeenCalledWith(
        { id: 10, tenantId: TEST_TENANT_ID },
        { scrapQuantity: 4 },
      );
    });

    it('nie pozwala rozstrzygnąć karty drugi raz', async () => {
      defectRepo.findOne!.mockResolvedValue(defect({ status: 'scrapped' }));

      await expect(service.resolve(1, { outcome: 'reworked' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('skasowanie ostatniej karty zeruje braki, zamiast zostawić starą liczbę', async () => {
      defectRepo.findOne!.mockResolvedValue(defect({ quantity: 7 }));
      defectRepo.find!.mockResolvedValue([]);

      await service.remove(1);

      expect(orderRepo.update).toHaveBeenCalledWith(
        { id: 10, tenantId: TEST_TENANT_ID },
        { scrapQuantity: 0 },
      );
    });
  });

  describe('pareto', () => {
    it('sortuje przyczyny malejąco i liczy skumulowany procent', async () => {
      queryBuilder.getMany.mockResolvedValue([
        defect({ id: 1, defectCode: 'surface', quantity: 6, status: 'scrapped' }),
        defect({ id: 2, defectCode: 'dimension', quantity: 3, status: 'scrapped' }),
        defect({ id: 3, defectCode: 'surface', quantity: 1, status: 'scrapped' }),
        defect({ id: 4, defectCode: 'material', quantity: 9, status: 'open' }),
      ]);

      const result = await service.pareto(30);

      expect(result.scrapQuantity).toBe(10);
      expect(result.openQuantity).toBe(9);
      expect(result.causes.map((c) => c.code)).toEqual(['surface', 'dimension']);
      expect(result.causes[0].quantity).toBe(7);
      expect(result.causes[0].pct).toBe(70);
      // Ostatnia przyczyna domyka listę do 100% — na tym opiera się linia Pareto.
      expect(result.causes[result.causes.length - 1].cumulativePct).toBe(100);
    });

    it('nie dzieli przez zero, gdy w oknie nie ma żadnych braków', async () => {
      queryBuilder.getMany.mockResolvedValue([]);

      const result = await service.pareto(7);

      expect(result.scrapQuantity).toBe(0);
      expect(result.causes).toEqual([]);
    });
  });
});
