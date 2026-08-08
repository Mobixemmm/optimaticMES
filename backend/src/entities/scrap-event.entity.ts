import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

// Skąd wzięło się zgłoszenie odrzutu. Pole jest w danych, a nie wyprowadzane
// z kontekstu, bo oba źródła mają inną wiarygodność: licznik z czujnika jest
// dokładny co do sztuki, ale nie zna przyczyny; operator zna przyczynę, ale
// klika w biegu. Raport, który ich nie rozróżnia, myli te dwie jakości danych.
export type ScrapSource = 'operator' | 'telemetry';

@Entity('scrap_events')
@Index('idx_scrap_events_machine_time', ['tenantId', 'machineId', 'recordedAt'])
@Index('idx_scrap_events_order', ['tenantId', 'orderId'])
export class ScrapEvent extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'machine_id', length: 100 })
  machineId: string;

  // Odrzut z czujnika potrafi wpaść, gdy na maszynie nie ma otwartego zlecenia
  // (rozruch, próba) — wtedy zostaje bez powiązania, zamiast być doklejony do
  // przypadkowego zlecenia.
  @Column({ name: 'order_id', type: 'int', nullable: true })
  orderId: number | null;

  @Column({ name: 'category_code', type: 'varchar', length: 40, nullable: true })
  categoryCode: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 3 })
  quantity: string;

  @Column({ type: 'varchar', length: 20 })
  source: ScrapSource;

  @Column({ name: 'operator_id', type: 'int', nullable: true })
  operatorId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  // Kiedy odrzut POWSTAŁ. Dla telemetrii to znacznik próbki z machine_data,
  // a nie moment importu — inaczej import po awarii łącza wrzuciłby tygodniową
  // zaległość w jedną minutę wykresu.
  @Column({ name: 'recorded_at', type: 'timestamp' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
