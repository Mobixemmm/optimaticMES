import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { MachinesService } from './machines.service';
import { Machine } from '../entities/machine.entity';
import { Tenant } from '../entities/tenant.entity';
import { MachineDataService } from '../machine-data/machine-data.service';
import {
  enterTestRequestContext,
  TEST_TENANT_ID,
} from '../common/testing/request-context.testing';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepo = <T extends ObjectLiteral>(): MockRepo<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((v) => v),
  save: jest.fn((v) => Promise.resolve(v)),
  remove: jest.fn(),
});

describe('MachinesService', () => {
  let service: MachinesService;
  let repo: MockRepo<Machine>;
  let machineDataService: { getUnscopedMachineIds: jest.Mock };

  beforeEach(async () => {
    enterTestRequestContext();
    machineDataService = { getUnscopedMachineIds: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachinesService,
        { provide: getRepositoryToken(Machine), useValue: createMockRepo<Machine>() },
        {
          provide: getRepositoryToken(Tenant),
          useValue: { find: jest.fn().mockResolvedValue([{ id: 1 }]) },
        },
        { provide: MachineDataService, useValue: machineDataService },
      ],
    }).compile();

    service = module.get<MachinesService>(MachinesService);
    repo = module.get(getRepositoryToken(Machine));
  });

  describe('syncFromTelemetry', () => {
    it('does nothing when telemetry reports no machines', async () => {
      machineDataService.getUnscopedMachineIds.mockResolvedValue([]);
      const added = await service.syncFromTelemetry();
      expect(added).toBe(0);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('adds only machines missing from the catalog', async () => {
      machineDataService.getUnscopedMachineIds.mockResolvedValue(['CNC-01', 'CNC-02', 'CNC-03']);
      (repo.find as jest.Mock).mockResolvedValue([
        { id: 1, machineId: 'CNC-01', name: 'CNC-01' } as Machine,
      ]);

      const added = await service.syncFromTelemetry();

      expect(added).toBe(2);
      expect(repo.save).toHaveBeenCalledTimes(2);
      expect(repo.create).toHaveBeenCalledWith({
        machineId: 'CNC-02',
        name: 'CNC-02',
        tenantId: TEST_TENANT_ID,
      });
      expect(repo.create).toHaveBeenCalledWith({
        machineId: 'CNC-03',
        name: 'CNC-03',
        tenantId: TEST_TENANT_ID,
      });
    });

    it('is a no-op when every telemetry machine is already catalogued', async () => {
      machineDataService.getUnscopedMachineIds.mockResolvedValue(['CNC-01']);
      (repo.find as jest.Mock).mockResolvedValue([
        { id: 1, machineId: 'CNC-01', name: 'CNC-01' } as Machine,
      ]);

      const added = await service.syncFromTelemetry();

      expect(added).toBe(0);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the machine does not exist', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllActive', () => {
    it('filters by isActive', async () => {
      (repo.find as jest.Mock).mockResolvedValue([]);
      await service.findAllActive();
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true, tenantId: TEST_TENANT_ID } }),
      );
    });
  });
});
