import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { enterTestRequestContext } from '../common/testing/request-context.testing';

type MockRepo = Partial<Record<keyof Repository<User>, jest.Mock>>;

const createMockRepo = (): MockRepo => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
});

describe('AuthService', () => {
  let service: AuthService;
  let repo: MockRepo;
  let roleRepo: MockRepo;

  beforeEach(async () => {
    enterTestRequestContext();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: createMockRepo() },
        { provide: getRepositoryToken(Role), useValue: createMockRepo() },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('signed-token') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repo = module.get(getRepositoryToken(User));
    roleRepo = module.get(getRepositoryToken(Role));

    // Domyślnie każda rola "istnieje" — assertRoleExists() jest sprawdzane
    // osobno, a bez tego wszystkie testy createUser/updateRole wywracałyby się
    // na walidacji roli zamiast na tym, co faktycznie testują.
    (roleRepo.findOne as jest.Mock).mockResolvedValue({
      id: 1,
      code: 'viewer',
      permissions: [],
    });
    (roleRepo.find as jest.Mock).mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('throws UnauthorizedException for an unknown email', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.validateUser('nobody@x.com', 'whatever'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for a wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      (repo.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'a@x.com',
        passwordHash,
      });

      await expect(
        service.validateUser('a@x.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns the user for correct credentials', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      const user = { id: 1, email: 'a@x.com', passwordHash };
      (repo.findOne as jest.Mock).mockResolvedValue(user);

      const result = await service.validateUser('a@x.com', 'correct-password');

      expect(result).toBe(user);
    });
  });

  describe('createUser', () => {
    it('throws ConflictException on duplicate email', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue({ id: 1 });

      await expect(
        service.createUser({
          name: 'X',
          email: 'a@x.com',
          password: 'secret1',
          role: 'viewer',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteUser', () => {
    it('throws BadRequestException when deleting the last user', async () => {
      (repo.count as jest.Mock).mockResolvedValue(1);

      await expect(service.deleteUser(1)).rejects.toThrow(BadRequestException);
    });
  });
});
