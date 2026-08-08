import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

@Entity('production_orders')
export class ProductionOrder extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // Unikalny w obrębie tenanta (idx_production_orders_tenant_ordernumber).
  @Column({ length: 50 })
  orderNumber: string;

  @Column({ length: 200 })
  productName: string;

  @Column()
  quantity: number;

  @Column({ default: 0 })
  producedQuantity: number;

  @Column({ default: 0 })
  scrapQuantity: number;

  // Wzorcowy czas cyklu (s/szt.) tego produktu — używany do liczenia
  // wskaźnika Performance w OEE. Bez niego Performance nie da się policzyć
  // rzetelnie (patrz AnalyticsService).
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  idealCycleTimeSec: number | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';

  // Stanowisko, na którym zlecenie ma być (lub było) wykonane. Ten sam
  // identyfikator co w telemetrii i przestojach — patrz Machine.machineId.
  // NULL = zlecenie nierozplanowane, czeka w puli.
  @Column({ name: 'machine_id', type: 'varchar', length: 100, nullable: true })
  machineId: string | null;

  // Pozycja w kolejce danej maszyny. Sama liczba nie musi być ciągła — liczy
  // się wyłącznie porządek, dzięki czemu wstawienie zlecenia w środek nie
  // wymaga przenumerowania całej kolejki.
  @Column({ type: 'int', nullable: true })
  sequence: number | null;

  @Column({ type: 'timestamp', nullable: true })
  plannedStart: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  actualStart: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  actualEnd: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
