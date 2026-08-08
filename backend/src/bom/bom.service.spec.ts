import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { BomService } from './bom.service';
import { BomItem } from '../entities/bom-item.entity';
import { MaterialConsumption } from '../entities/material-consumption.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import {
  enterTestRequestContext,
  TEST_TENANT_ID,
} from '../common/testing/request-context.testing';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

// Postgres zwraca `numeric` jako string — testy celowo podają stringi, bo to
// jest realny kształt danych i na tym przewracała się arytmetyka.
function material(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 4,
    tenantId: TEST_TENANT_ID,
    code: 'MAT-01',
    name: 'Granulat ABS',
    stock: '100.00' as unknown as number,
    unit: 'kg',
    minStock: '10.00' as unknown as number,
    category: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function order(overrides: Partial<ProductionOrder> = {}): ProductionOrder {
  return {
    id: 12,
    tenantId: TEST_TENANT_ID,
    orderNumber: 'WO-12',
    productName: 'Obudowa ABS',
    quantity: 200,
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

describe('BomService', () => {
  let service: BomService;
  let bomRepo: MockRepo<BomItem>;
  let consumptionRepo: MockRepo<MaterialConsumption>;
  let inventoryRepo: MockRepo<InventoryItem>;
  let orderRepo: MockRepo<ProductionOrder>;

  beforeEach(async () => {
    enterTestRequestContext();

    bomRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((d) => d as BomItem),
      save: jest.fn((d) => Promise.resolve({ id: 1, ...d })),
      remove: jest.fn(),
    };
    consumptionRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((d) => d as MaterialConsumption),
      save: jest.fn((d) => Promise.resolve({ id: 1, ...d })),
      remove: jest.fn(),
    };
    inventoryRepo = {
      find: jest.fn().mockResolvedValue([material()]),
      findOne: jest.fn().mockResolvedValue(material()),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    orderRepo = {
      findOne: jest.fn().mockResolvedValue(order()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BomService,
        { provide: getRepositoryToken(BomItem), useValue: bomRepo },
        { provide: getRepositoryToken(MaterialConsumption), useValue: consumptionRepo },
        { provide: getRepositoryToken(InventoryItem), useValue: inventoryRepo },
        { provide: getRepositoryToken(ProductionOrder), useValue: orderRepo },
      ],
    }).compile();

    service = module.get<BomService>(BomService);
  });

  describe('create', () => {
    it('nie pozwala dodać tego samego materiału do receptury dwa razy', async () => {
      bomRepo.findOne!.mockResolvedValue({ id: 7 } as BomItem);

      await expect(
        service.create({ productName: 'Obudowa ABS', inventoryItemId: 4, quantityPer: 0.5 }),
      ).rejects.toThrow(ConflictException);
    });

    it('odrzuca materiał spoza kartoteki magazynowej', async () => {
      inventoryRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.create({ productName: 'Obudowa ABS', inventoryItemId: 999, quantityPer: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('requirementsForOrder', () => {
    it('mnoży normę przez wielkość zlecenia i odejmuje to, co już wydano', async () => {
      bomRepo.find!.mockResolvedValue([
        { id: 1, inventoryItemId: 4, quantityPer: '0.2500', productName: 'Obudowa ABS' },
      ] as BomItem[]);
      consumptionRepo.find!.mockResolvedValue([
        { inventoryItemId: 4, quantity: '20.00' },
      ] as unknown as MaterialConsumption[]);

      const result = await service.requirementsForOrder(12);

      expect(result.planned[0].required).toBe(50);
      expect(result.planned[0].issued).toBe(20);
      expect(result.planned[0].remaining).toBe(30);
      expect(result.planned[0].overIssued).toBe(0);
    });

    it('wykazuje nadzużycie, gdy wydano więcej niż przewiduje receptura', async () => {
      bomRepo.find!.mockResolvedValue([
        { id: 1, inventoryItemId: 4, quantityPer: '0.1000', productName: 'Obudowa ABS' },
      ] as BomItem[]);
      consumptionRepo.find!.mockResolvedValue([
        { inventoryItemId: 4, quantity: '25.00' },
      ] as unknown as MaterialConsumption[]);

      const result = await service.requirementsForOrder(12);

      expect(result.planned[0].required).toBe(20);
      expect(result.planned[0].overIssued).toBe(5);
      expect(result.planned[0].remaining).toBe(0);
    });

    it('pokazuje osobno materiał wydany spoza receptury', async () => {
      bomRepo.find!.mockResolvedValue([]);
      consumptionRepo.find!.mockResolvedValue([
        { inventoryItemId: 4, quantity: '3.00' },
      ] as unknown as MaterialConsumption[]);

      const result = await service.requirementsForOrder(12);

      expect(result.hasBom).toBe(false);
      expect(result.unplanned).toHaveLength(1);
      expect(result.unplanned[0].issued).toBe(3);
    });
  });

  describe('consume', () => {
    it('zdejmuje wydaną ilość ze stanu magazynowego', async () => {
      await service.consume({
        orderId: 12,
        inventoryItemId: 4,
        batchNumber: 'LOT-2026-0345',
        quantity: 25,
      });

      expect(inventoryRepo.update).toHaveBeenCalledWith(
        { id: 4, tenantId: TEST_TENANT_ID },
        { stock: 75 },
      );
    });

    it('blokuje wydanie ponad stan, zamiast schodzić poniżej zera', async () => {
      inventoryRepo.findOne!.mockResolvedValue(material({ stock: '5.00' as unknown as number }));

      await expect(
        service.consume({
          orderId: 12,
          inventoryItemId: 4,
          batchNumber: 'LOT-1',
          quantity: 10,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(inventoryRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('removeConsumption', () => {
    it('cofnięcie wydania zwraca materiał na stan', async () => {
      consumptionRepo.findOne!.mockResolvedValue({
        id: 3,
        inventoryItemId: 4,
        quantity: '25.00',
      } as unknown as MaterialConsumption);

      await service.removeConsumption(3);

      expect(inventoryRepo.update).toHaveBeenCalledWith(
        { id: 4, tenantId: TEST_TENANT_ID },
        { stock: 125 },
      );
    });
  });
});
