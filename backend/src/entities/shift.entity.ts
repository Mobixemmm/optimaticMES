import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

// Definicja cyklicznej zmiany produkcyjnej (np. "Zmiana I" pon-pt 06:00-14:00).
// Model zakłada, że harmonogram powtarza się co tydzień dla całego zakładu —
// nie ma tu (jeszcze) kalendarza świąt/wyjątków ani zmian per-maszyna.
// Używane przez AnalyticsService do liczenia planowanego czasu pracy (Availability
// w OEE) zamiast zakładania pracy 24/7.
@Entity('shifts')
export class Shift extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  // 0 = niedziela ... 6 = sobota (jak Date.getDay())
  @Column({ name: 'day_of_week', type: 'smallint' })
  dayOfWeek: number;

  // Format 'HH:mm', czas lokalny wg TZ procesu
  @Column({ name: 'start_time', type: 'varchar', length: 5 })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar', length: 5 })
  endTime: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
