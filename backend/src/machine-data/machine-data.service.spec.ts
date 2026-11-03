import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MachineDataService } from './machine-data.service';
import { MachineData } from '../entities/machine-data.entity';

describe('MachineDataService', () => {
  let service: MachineDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachineDataService,
        { provide: getRepositoryToken(MachineData), useValue: {} },
      ],
    }).compile();

    service = module.get<MachineDataService>(MachineDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
