import { Test, TestingModule } from '@nestjs/testing';
import { MachineDataService } from './machine-data.service';

describe('MachineDataService', () => {
  let service: MachineDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MachineDataService],
    }).compile();

    service = module.get<MachineDataService>(MachineDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
