import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

export type AndonTone = 'err' | 'warn' | 'info';

@Entity('andon_alerts')
export class AndonAlert extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  type: string; // np. Awaria / Materiał / Jakość / Info

  @Column({ name: 'machine_id', type: 'varchar', length: 100, nullable: true })
  machineId: string | null;

  @Column({ length: 255 })
  message: string;

  @Column({ type: 'varchar', length: 20, default: 'info' })
  tone: AndonTone;

  @Column({ name: 'is_resolved', default: false })
  isResolved: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;
}
