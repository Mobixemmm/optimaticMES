import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { OperatorsService } from './operators.service';
import { Operator } from '../entities/operator.entity';
import { OperatorSession } from '../entities/operator-session.entity';
import {
  enterTestRequestContext,
  TEST_TENANT_ID,
} from '../common/testing/request-context.testing';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepo = <T extends ObjectLiteral>(): MockRepo<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

describe('OperatorsService', () => {
  let service: OperatorsService;
  let operatorRepo: MockRepo<Operator>;
  let sessionRepo: MockRepo<OperatorSession>;

  beforeEach(async () => {
    enterTestRequestContext();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperatorsService,
        {
          provide: getRepositoryToken(Operator),
          useValue: createMockRepo<Operator>(),
        },
        {
          provide: getRepositoryToken(OperatorSession),
          useValue: createMockRepo<OperatorSession>(),
        },
      ],
    }).compile();

    service = module.get<OperatorsService>(OperatorsService);
    operatorRepo = module.get(getRepositoryToken(Operator));
    sessionRepo = module.get(getRepositoryToken(OperatorSession));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loginWithRfid', () => {
    it('throws UnauthorizedException for an unknown RFID card', async () => {
      (operatorRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.loginWithRfid('UNKNOWN', '1234')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for a wrong PIN', async () => {
      const operator = {
        id: 1,
        rfidCardId: 'A1',
        isActive: true,
        pinHash: await bcrypt.hash('1234', 4),
      } as Operator;
      (operatorRepo.findOne as jest.Mock).mockResolvedValue(operator);

      await expect(service.loginWithRfid('A1', '9999')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('closes previous active sessions and opens a new one when the PIN matches', async () => {
      const operator = {
        id: 1,
        rfidCardId: 'A1',
        isActive: true,
        pinHash: await bcrypt.hash('1234', 4),
      } as Operator;
      const newSession = {
        id: 10,
        operatorId: 1,
        rfidCardId: 'A1',
      } as OperatorSession;
      (operatorRepo.findOne as jest.Mock).mockResolvedValue(operator);
      (sessionRepo.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (sessionRepo.create as jest.Mock).mockReturnValue(newSession);
      (sessionRepo.save as jest.Mock).mockResolvedValue(newSession);

      const result = await service.loginWithRfid('A1', '1234');

      expect(sessionRepo.update).toHaveBeenCalledWith(
        { operatorId: 1, isActive: true, tenantId: TEST_TENANT_ID },
        expect.objectContaining({ isActive: false }),
      );
      expect(result.operator).toBe(operator);
      expect(result.session).toBe(newSession);
    });
  });

  describe('create', () => {
    it('hashes the plaintext PIN before saving and never stores it as-is', async () => {
      (operatorRepo.create as jest.Mock).mockImplementation((v) => v);
      (operatorRepo.save as jest.Mock).mockImplementation((v) => Promise.resolve(v));

      const saved = await service.create({
        firstName: 'Jan',
        lastName: 'Kowalski',
        rfidCardId: 'A1',
        pinCode: '1234',
      });

      expect(saved).not.toHaveProperty('pinCode');
      expect(saved.pinHash).toBeDefined();
      expect(saved.pinHash).not.toBe('1234');
      await expect(bcrypt.compare('1234', saved.pinHash as string)).resolves.toBe(true);
    });
  });

  describe('update', () => {
    it('rehashes the PIN when a new one is provided', async () => {
      const existing = {
        id: 1,
        firstName: 'Jan',
        lastName: 'Kowalski',
        rfidCardId: 'A1',
        pinHash: 'old-hash',
      } as Operator;
      (operatorRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (operatorRepo.save as jest.Mock).mockImplementation((v) => Promise.resolve(v));

      const updated = await service.update(1, { pinCode: '5678' });

      expect(updated.pinHash).not.toBe('old-hash');
      await expect(bcrypt.compare('5678', updated.pinHash as string)).resolves.toBe(true);
    });

    it('leaves the existing PIN hash untouched when no new PIN is given', async () => {
      const existing = {
        id: 1,
        firstName: 'Jan',
        lastName: 'Kowalski',
        rfidCardId: 'A1',
        pinHash: 'unchanged-hash',
      } as Operator;
      (operatorRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (operatorRepo.save as jest.Mock).mockImplementation((v) => Promise.resolve(v));

      const updated = await service.update(1, { station: 'CNC-05' });

      expect(updated.pinHash).toBe('unchanged-hash');
      expect(updated.station).toBe('CNC-05');
    });
  });
});
