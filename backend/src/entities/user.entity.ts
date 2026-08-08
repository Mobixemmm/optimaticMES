import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

// Rola to teraz kod wiersza z tabeli `roles`, a nie zamknięta unia w kodzie —
// klient może w panelu admina dodać własną ("Brygadzista hali 2"). Kod aplikacji
// nigdy nie porównuje się do nazwy roli, tylko pyta o uprawnienia
// (@RequirePermission / PERMISSIONS z auth/permissions.constants.ts).
export type UserRole = string;

@Entity('users')
export class User extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200, unique: true })
  email: string;

  @Column({ name: 'password_hash', length: 100 })
  passwordHash: string;

  @Column({ length: 150 })
  name: string;

  // FK na roles(tenant_id, code) — patrz migracja CreateTenancyAndRbac.
  @Column({ length: 60, default: 'viewer' })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
