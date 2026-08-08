import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { currentTenantId } from '../common/request-context';
import { ALL_PERMISSIONS, PERMISSIONS } from './permissions.constants';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

const CACHE_TTL_MS = 30_000;

export interface ResolvedRole {
  permissions: string[];
  siteScope: number[] | null;
}

@Injectable()
export class RolesService {
  // Rola jest czytana przy KAŻDYM żądaniu (guard), więc bez cache dokładalibyśmy
  // jedno zapytanie do bazy na każdy request. TTL jest krótki, a zapisy i tak
  // czyszczą cache od razu — zmiana uprawnień działa natychmiast.
  private cache = new Map<string, { value: ResolvedRole; expiresAt: number }>();

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Wywoływane z RequestContextGuard, zanim istnieje kontekst żądania —
  // dlatego tenant przychodzi tu jawnie, a nie przez currentTenantId().
  async resolve(tenantId: number, roleCode: string): Promise<ResolvedRole> {
    const cacheKey = `${tenantId}:${roleCode}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const role = await this.roleRepository.findOne({
      where: { tenantId, code: roleCode },
    });
    // Rola skasowana albo nieznana = zero uprawnień. Nie podstawiamy tu żadnych
    // domyślnych — cicha eskalacja uprawnień byłaby gorsza niż odmowa dostępu.
    const value: ResolvedRole = role
      ? { permissions: role.permissions ?? [], siteScope: role.siteScope ?? null }
      : { permissions: [], siteScope: [] };

    this.cache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  }

  private invalidate(): void {
    this.cache.clear();
  }

  async list(): Promise<Role[]> {
    return this.roleRepository.find({
      where: { tenantId: currentTenantId() },
      order: { isSystem: 'DESC', name: 'ASC' },
    });
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const tenantId = currentTenantId();
    this.assertKnownPermissions(dto.permissions);

    const existing = await this.roleRepository.findOne({
      where: { tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Rola o kodzie "${dto.code}" już istnieje`);
    }

    const role = this.roleRepository.create({
      tenantId,
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      permissions: dto.permissions,
      siteScope: dto.siteScope ?? null,
      isSystem: false,
    });
    const saved = await this.roleRepository.save(role);
    this.invalidate();
    return saved;
  }

  async update(id: number, dto: UpdateRoleDto): Promise<Role> {
    const tenantId = currentTenantId();
    const role = await this.roleRepository.findOne({ where: { id, tenantId } });
    if (!role) {
      throw new NotFoundException('Rola nie istnieje');
    }

    if (dto.permissions) {
      this.assertKnownPermissions(dto.permissions);
      // Ostatnia rola z prawem do zarządzania rolami nie może go stracić —
      // inaczej klient jednym zapisem odcina sobie drogę do panelu admina.
      await this.assertNotLastAdministrativeRole(role, dto.permissions);
      role.permissions = dto.permissions;
    }
    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.siteScope !== undefined) role.siteScope = dto.siteScope;

    const saved = await this.roleRepository.save(role);
    this.invalidate();
    return saved;
  }

  async remove(id: number): Promise<void> {
    const tenantId = currentTenantId();
    const role = await this.roleRepository.findOne({ where: { id, tenantId } });
    if (!role) {
      throw new NotFoundException('Rola nie istnieje');
    }
    if (role.isSystem) {
      throw new BadRequestException('Nie można usunąć roli systemowej');
    }

    const usersWithRole = await this.userRepository.count({
      where: { tenantId, role: role.code },
    });
    if (usersWithRole > 0) {
      throw new BadRequestException(
        `Roli używa ${usersWithRole} użytkownik(ów) — najpierw zmień im rolę`,
      );
    }

    await this.roleRepository.remove(role);
    this.invalidate();
  }

  private assertKnownPermissions(permissions: string[]): void {
    const unknown = permissions.filter(
      (p) => !(ALL_PERMISSIONS as string[]).includes(p),
    );
    if (unknown.length > 0) {
      throw new BadRequestException(`Nieznane uprawnienia: ${unknown.join(', ')}`);
    }
  }

  private async assertNotLastAdministrativeRole(
    role: Role,
    nextPermissions: string[],
  ): Promise<void> {
    const stillAdministrative = nextPermissions.includes(PERMISSIONS.ROLES_WRITE);
    if (stillAdministrative) {
      return;
    }

    const roles = await this.roleRepository.find({ where: { tenantId: role.tenantId } });
    const otherAdministrative = roles.filter(
      (r) => r.id !== role.id && (r.permissions ?? []).includes(PERMISSIONS.ROLES_WRITE),
    );
    if (otherAdministrative.length === 0) {
      throw new BadRequestException(
        'To jedyna rola z uprawnieniem roles.write — odebranie go zablokowałoby dostęp do zarządzania rolami',
      );
    }
  }
}
