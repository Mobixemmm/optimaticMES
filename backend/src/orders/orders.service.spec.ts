import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdersService } from './orders.service';
import { ProductionOrder } from '../entities/production-order.entity';
import { enterTestRequestContext } from '../common/testing/request-context.testing';

type MockRepo = Partial<Record<keyof Repository<ProductionOrder>, jest.Mock>>;

const createMockRepo = (): MockRepo => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

describe('OrdersService', () => {
  let service: OrdersService;
  let repo: MockRepo;

  beforeEach(async () => {
    enterTestRequestContext();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(ProductionOrder),
          useValue: createMockRepo(),
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    repo = module.get(getRepositoryToken(ProductionOrder));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateStatus', () => {
    it('sets actualStart when status becomes in_progress', async () => {
      const order = { id: 1, status: 'pending' } as ProductionOrder;
      (repo.findOne as jest.Mock).mockResolvedValue(order);
      (repo.save as jest.Mock).mockImplementation((o) => Promise.resolve(o));

      const result = await service.updateStatus(1, 'in_progress');

      expect(result.status).toBe('in_progress');
      expect(result.actualStart).toBeInstanceOf(Date);
      expect(result.actualEnd).toBeUndefined();
    });

    it('sets actualEnd when status becomes completed', async () => {
      const order = { id: 1, status: 'in_progress' } as ProductionOrder;
      (repo.findOne as jest.Mock).mockResolvedValue(order);
      (repo.save as jest.Mock).mockImplementation((o) => Promise.resolve(o));

      const result = await service.updateStatus(1, 'completed');

      expect(result.status).toBe('completed');
      expect(result.actualEnd).toBeInstanceOf(Date);
    });

    it('throws NotFoundException for a missing order', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.updateStatus(999, 'completed')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('throws NotFoundException for a missing order', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });

    it('removes an existing order', async () => {
      const order = { id: 1 } as ProductionOrder;
      (repo.findOne as jest.Mock).mockResolvedValue(order);
      (repo.remove as jest.Mock).mockResolvedValue(order);

      await service.delete(1);

      expect(repo.remove).toHaveBeenCalledWith(order);
    });
  });
});
