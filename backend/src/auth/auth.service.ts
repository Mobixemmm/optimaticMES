import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { currentTenantId } from '../common/request-context';
import { PERMISSIONS } from './permissions.constants';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private jwtService: JwtService,
  ) {}

  // Logowanie jest publiczne i poprzedza ustalenie kontekstu, więc tenant
  // bierze się z samego wiersza użytkownika (e-mail jest unikalny globalnie).
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase(), isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException('Nieprawidłowy e-mail lub hasło');
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Nieprawidłowy e-mail lub hasło');
    }
    return user;
  }

  issueToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });
  }

  toPublicUser(user: User) {
    const rest: Partial<User> = { ...user };
    delete rest.passwordHash;
    return rest;
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id, tenantId: currentTenantId() } });
  }

  async listUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: { tenantId: currentTenantId() },
      order: { createdAt: 'ASC' },
    });
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    const tenantId = currentTenantId();
    await this.assertRoleExists(tenantId, dto.role);

    // E-mail jest unikalny w całej instalacji, nie tylko w obrębie klienta —
    // inaczej logowanie (które poprzedza ustalenie tenanta) byłoby niejednoznaczne.
    const existing = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException(
        'Użytkownik o podanym adresie e-mail już istnieje',
      );
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.userRepository.create({
      tenantId,
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
      role: dto.role,
    });
    return this.userRepository.save(user);
  }

  async updateRole(id: number, role: User['role']): Promise<User> {
    const tenantId = currentTenantId();
    await this.assertRoleExists(tenantId, role);

    const user = await this.userRepository.findOne({ where: { id, tenantId } });
    if (!user) {
      throw new BadRequestException('Użytkownik nie istnieje');
    }
    await this.assertNotLastAdministrator(tenantId, user, role);

    user.role = role;
    return this.userRepository.save(user);
  }

  async deleteUser(id: number): Promise<void> {
    const tenantId = currentTenantId();
    const total = await this.userRepository.count({ where: { tenantId } });
    if (total <= 1) {
      throw new BadRequestException('Nie można usunąć ostatniego użytkownika');
    }
    const user = await this.userRepository.findOne({ where: { id, tenantId } });
    if (!user) {
      throw new BadRequestException('Użytkownik nie istnieje');
    }
    await this.assertNotLastAdministrator(tenantId, user, null);

    await this.userRepository.remove(user);
  }

  private async assertRoleExists(tenantId: number, code: string): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { tenantId, code } });
    if (!role) {
      throw new BadRequestException(`Rola "${code}" nie istnieje`);
    }
  }

  // Zabezpieczenie przed zatrzaśnięciem drzwi od środka: skoro role i moduły są
  // w pełni konfigurowalne, klient mógłby jednym zapisem zostać bez nikogo, kto
  // ma dostęp do panelu administratora.
  private async assertNotLastAdministrator(
    tenantId: number,
    user: User,
    nextRoleCode: string | null,
  ): Promise<void> {
    const roles = await this.roleRepository.find({ where: { tenantId } });
    const adminRoleCodes = roles
      .filter((r) => (r.permissions ?? []).includes(PERMISSIONS.USERS_WRITE))
      .map((r) => r.code);

    if (adminRoleCodes.length === 0 || !adminRoleCodes.includes(user.role)) {
      return;
    }
    if (nextRoleCode !== null && adminRoleCodes.includes(nextRoleCode)) {
      return;
    }

    const remainingAdmins = await this.userRepository
      .createQueryBuilder('user')
      .where('user.tenantId = :tenantId', { tenantId })
      .andWhere('user.id != :id', { id: user.id })
      .andWhere('user.isActive = true')
      .andWhere('user.role IN (:...codes)', { codes: adminRoleCodes })
      .getCount();

    if (remainingAdmins === 0) {
      throw new BadRequestException(
        'To ostatni użytkownik z prawem zarządzania użytkownikami — zmiana odcięłaby dostęp do panelu administratora',
      );
    }
  }
}
