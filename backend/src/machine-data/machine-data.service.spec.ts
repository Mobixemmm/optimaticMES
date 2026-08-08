import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MachineDataService } from './machine-data.service';
import { MachineData } from '../entities/machine-data.entity';
import { enterTestRequestContext } from '../common/testing/request-context.testing';

describe('MachineDataService', () => {
  let service: MachineDataService;

  beforeEach(async () => {
    enterTestRequestContext();
    const queryBuilderMock = {
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      distinctOn: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachineDataService,
        {
          provide: getRepositoryToken(MachineData),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
          },
        },
      ],
    }).compile();

    service = module.get<MachineDataService>(MachineDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
