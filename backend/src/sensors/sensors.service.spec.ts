import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SensorsService } from './sensors.service';
import { SensorData } from '../entities/sensor-data.entity';
import { Tenant } from '../entities/tenant.entity';
import { enterTestRequestContext } from '../common/testing/request-context.testing';

describe('SensorsService', () => {
  let service: SensorsService;

  beforeEach(async () => {
    enterTestRequestContext();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorsService,
        {
          provide: getRepositoryToken(SensorData),
          useValue: { create: jest.fn(), save: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: { find: jest.fn().mockResolvedValue([{ id: 1 }]) },
        },
      ],
    }).compile();

    service = module.get<SensorsService>(SensorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
