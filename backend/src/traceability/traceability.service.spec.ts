import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { TraceabilityService } from './traceability.service';
import { MaterialConsumption } from '../entities/material-consumption.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { QualityDefect } from '../entities/quality-defect.entity';
import { OperatorSession } from '../entities/operator-session.entity';
import { Operator } from '../entities/operator.entity';
import { enterTestRequestContext } from '../common/testing/request-context.testing';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('TraceabilityService', () => {
  let service: TraceabilityService;
  let consumptionRepo: MockRepo<MaterialConsumption>;
  let inventoryRepo: MockRepo<InventoryItem>;
  let orderRepo: MockRepo<ProductionOrder>;
  let defectRepo: MockRepo<QualityDefect>;
  let sessionRepo: MockRepo<OperatorSession>;
  let operatorRepo: MockRepo<Operator>;

  beforeEach(async () => {
    enterTestRequestContext();

    consumptionRepo = { find: jest.fn().mockResolvedValue([]) };
    inventoryRepo = { find: jest.fn().mockResolvedValue([]) };
    orderRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    defectRepo = { find: jest.fn().mockResolvedValue([]) };
    sessionRepo = { find: jest.fn().mockResolvedValue([]) };
    operatorRepo = { find: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TraceabilityService,
        { provide: getRepositoryToken(MaterialConsumption), useValue: consumptionRepo },
        { provide: getRepositoryToken(InventoryItem), useValue: inventoryRepo },
        { provide: getRepositoryToken(ProductionOrder), useValue: orderRepo },
        { provide: getRepositoryToken(QualityDefect), useValue: defectRepo },
        { provide: getRepositoryToken(OperatorSession), useValue: sessionRepo },
        { provide: getRepositoryToken(Operator), useValue: operatorRepo },
      ],
    }).compile();

    service = module.get<TraceabilityService>(TraceabilityService);
  });

  describe('traceOrder', () => {
    it('rzuca, gdy zlecenia nie ma', async () => {
      orderRepo.findOne!.mockResolvedValue(null);
      await expect(service.traceOrder(99)).rejects.toThrow(NotFoundException);
    });

    it('składa paszport z partii materiału i kart wad', async () => {
      orderRepo.findOne!.mockResolvedValue({
        id: 12,
        orderNumber: 'WO-12',
        productName: 'Obudowa ABS',
        quantity: 200,
        producedQuantity: 180,
        scrapQuantity: 5,
        status: 'completed',
        actualStart: new Date('2026-07-01T06:00:00Z'),
        actualEnd: new Date('2026-07-01T14:00:00Z'),
      } as ProductionOrder);
      consumptionRepo.find!.mockResolvedValue([
        {
          id: 1,
          inventoryItemId: 4,
          batchNumber: 'LOT-2026-0345',
          quantity: '50.00',
          consumedAt: new Date(),
          consumedBy: 'A. Kowalski',
        },
      ] as unknown as MaterialConsumption[]);
      inventoryRepo.find!.mockResolvedValue([
        { id: 4, code: 'MAT-01', name: 'Granulat ABS', unit: 'kg' },
      ] as InventoryItem[]);
      defectRepo.find!.mockResolvedValue([
        {
          id: 9,
          defectCode: 'surface',
          quantity: 5,
          status: 'scrapped',
          machineId: 'PRESS-01',
          detectedAt: new Date(),
          detectedBy: null,
        },
      ] as QualityDefect[]);

      const result = await service.traceOrder(12);

      expect(result.materials[0].batchNumber).toBe('LOT-2026-0345');
      expect(result.materials[0].quantity).toBe(50);
      expect(result.materials[0].code).toBe('MAT-01');
      expect(result.defects[0].label).toBe('Wada powierzchni');
      expect(result.machines).toEqual(['PRESS-01']);
      // Obsada jest wywnioskowana z pokrycia czasowego, nie zarejestrowana —
      // odpowiedź musi to przyznawać wprost.
      expect(result.operatorsAreInferred).toBe(true);
    });

    it('nie zgaduje obsady, gdy zlecenie nie ma czasu startu', async () => {
      orderRepo.findOne!.mockResolvedValue({
        id: 12,
        orderNumber: 'WO-12',
        productName: 'X',
        quantity: 1,
        producedQuantity: 0,
        scrapQuantity: 0,
        status: 'pending',
        actualStart: null,
        actualEnd: null,
      } as ProductionOrder);

      const result = await service.traceOrder(12);

      expect(result.operators).toEqual([]);
      expect(sessionRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('traceBatch', () => {
    it('zwraca found=false dla partii, której nigdzie nie wydano', async () => {
      consumptionRepo.find!.mockResolvedValue([]);

      const result = await service.traceBatch('LOT-NIEZNANY');

      expect(result.found).toBe(false);
      expect(result.affectedOrders).toEqual([]);
    });

    it('wskazuje wszystkie zlecenia dotknięte partią i ich braki', async () => {
      consumptionRepo.find!.mockResolvedValue([
        {
          orderId: 12,
          inventoryItemId: 4,
          batchNumber: 'LOT-1',
          quantity: '30.00',
          consumedAt: new Date('2026-07-01T08:00:00Z'),
        },
        {
          orderId: 13,
          inventoryItemId: 4,
          batchNumber: 'LOT-1',
          quantity: '20.00',
          consumedAt: new Date('2026-07-02T08:00:00Z'),
        },
      ] as unknown as MaterialConsumption[]);
      orderRepo.find!.mockResolvedValue([
        { id: 12, orderNumber: 'WO-12', productName: 'A', status: 'completed', producedQuantity: 100 },
        { id: 13, orderNumber: 'WO-13', productName: 'B', status: 'in_progress', producedQuantity: 40 },
      ] as ProductionOrder[]);
      inventoryRepo.find!.mockResolvedValue([
        { id: 4, code: 'MAT-01', name: 'Granulat ABS', unit: 'kg' },
      ] as InventoryItem[]);
      defectRepo.find!.mockResolvedValue([
        { orderId: 12, quantity: 5, status: 'scrapped' },
        // Otwarta poprawka nie jest jeszcze stratą — nie może wejść do sumy.
        { orderId: 13, quantity: 8, status: 'open' },
      ] as QualityDefect[]);

      const result = await service.traceBatch('LOT-1');

      expect(result.found).toBe(true);
      expect(result.totalQuantity).toBe(50);
      expect(result.affectedOrders).toHaveLength(2);
      expect(result.affectedOrders[0].orderNumber).toBe('WO-12');
      expect(result.affectedOrders[0].consumedQuantity).toBe(30);
      expect(result.affectedOrders[0].scrapQuantity).toBe(5);
      expect(result.affectedOrders[1].scrapQuantity).toBe(0);
    });
  });
});
