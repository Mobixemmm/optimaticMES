import { Test, TestingModule } from '@nestjs/testing';
import { OperatorsController } from './operators.controller';
import { OperatorsService } from './operators.service';

describe('OperatorsController', () => {
  let controller: OperatorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OperatorsController],
      providers: [{ provide: OperatorsService, useValue: {} }],
    }).compile();

    controller = module.get<OperatorsController>(OperatorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
