import { Test, TestingModule } from '@nestjs/testing';
import { MachineDataController } from './machine-data.controller';
import { MachineDataService } from './machine-data.service';
import { enterTestRequestContext } from '../common/testing/request-context.testing';

describe('MachineDataController', () => {
  let controller: MachineDataController;

  beforeEach(async () => {
    enterTestRequestContext();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MachineDataController],
      providers: [
        {
          provide: MachineDataService,
          useValue: {
            findLatest: jest.fn(),
            findByTag: jest.fn(),
            getMachines: jest.fn(),
            getTags: jest.fn(),
            getLatestValues: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MachineDataController>(MachineDataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
