import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SensorsService } from './sensors.service';
import { SensorData } from '../entities/sensor-data.entity';

describe('SensorsService', () => {
  let service: SensorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensorsService,
        { provide: getRepositoryToken(SensorData), useValue: {} },
      ],
    }).compile();

    service = module.get<SensorsService>(SensorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
