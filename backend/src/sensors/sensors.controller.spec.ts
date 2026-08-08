import { Test, TestingModule } from '@nestjs/testing';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';
import { enterTestRequestContext } from '../common/testing/request-context.testing';

describe('SensorsController', () => {
  let controller: SensorsController;

  beforeEach(async () => {
    enterTestRequestContext();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SensorsController],
      providers: [
        {
          provide: SensorsService,
          useValue: { findLatest: jest.fn(), simulateTemperature: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<SensorsController>(SensorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
