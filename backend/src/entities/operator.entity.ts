import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

@Entity('operators')
export class Operator extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  // Unikalna w obrębie tenanta (idx_operators_tenant_rfidcardid).
  @Column({ length: 50 })
  rfidCardId: string; // numer karty RFID

  // Kolumna fizycznie nazywa się "pinCode" (camelCase, jak reszta tej — starszej,
  // sprzed migracji — tabeli); trzyma teraz hash bcrypt, nie plaintext.
  @Column({ name: 'pinCode', type: 'varchar', length: 100, nullable: true })
  pinHash: string | null;

  @Column({ length: 100, default: 'Operator' })
  role: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  station: string | null;

  @Column({ length: 20, default: 'I' })
  shift: string;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  efficiencyPct: number | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
