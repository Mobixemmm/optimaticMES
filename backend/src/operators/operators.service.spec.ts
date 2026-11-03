import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OperatorsService } from './operators.service';
import { Operator } from '../entities/operator.entity';
import { OperatorSession } from '../entities/operator-session.entity';

describe('OperatorsService', () => {
  let service: OperatorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperatorsService,
        { provide: getRepositoryToken(Operator), useValue: {} },
        { provide: getRepositoryToken(OperatorSession), useValue: {} },
      ],
    }).compile();

    service = module.get<OperatorsService>(OperatorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
