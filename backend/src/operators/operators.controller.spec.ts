import { Test, TestingModule } from '@nestjs/testing';
import { OperatorsController } from './operators.controller';
import { OperatorsService } from './operators.service';
import { enterTestRequestContext } from '../common/testing/request-context.testing';

describe('OperatorsController', () => {
  let controller: OperatorsController;

  beforeEach(async () => {
    enterTestRequestContext();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OperatorsController],
      providers: [
        {
          provide: OperatorsService,
          useValue: {
            loginWithRfid: jest.fn(),
            logout: jest.fn(),
            getActiveSession: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OperatorsController>(OperatorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
