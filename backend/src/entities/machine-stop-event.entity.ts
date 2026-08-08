import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

export type StopReason =
  | 'failure'
  | 'setup'
  | 'material'
  | 'micro_stop'
  | 'quality'
  | 'planned';

@Entity('machine_stop_events')
export class MachineStopEvent extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  machine: string;

  @Column({ type: 'varchar', length: 20 })
  reason: StopReason;

  // timestamptz, nie timestamp: przestój to moment w czasie, a nie cyfry na
  // ścianie. Na kolumnie naiwnej zmiana czasu na zimowy albo deploy API w innej
  // strefie po cichu przesuwały całą historię (patrz migracja 1754000000022).
  @Column({ name: 'start_failure', type: 'timestamptz' })
  startFailure: Date;

  // NULL = przestój trwa. To jest jedyny znacznik "otwartości" i pilnuje go
  // indeks częściowy uq_machine_stop_events_open.
  @Column({ name: 'end_failure', type: 'timestamptz', nullable: true })
  endFailure: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
