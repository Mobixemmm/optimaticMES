import { Test, TestingModule } from '@nestjs/testing';
import { MachineDataController } from './machine-data.controller';
import { MachineDataService } from './machine-data.service';

describe('MachineDataController', () => {
  let controller: MachineDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MachineDataController],
      providers: [{ provide: MachineDataService, useValue: {} }],
    }).compile();

    controller = module.get<MachineDataController>(MachineDataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
