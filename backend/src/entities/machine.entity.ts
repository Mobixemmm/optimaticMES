import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

// Kartoteka maszyn — źródło prawdy o tym, jakie maszyny istnieją w zakładzie.
// machineId to ten sam identyfikator, którym posługują się machine_data
// (telemetria) i machine_stop_events (przestoje); telemetria nie ma FK do tej
// tabeli (gateway pisze po samym stringu), więc MachinesService.syncFromTelemetry()
// dogrywa brakujące wpisy, żeby żadna zgłaszająca się maszyna nie "zniknęła".
@Entity('machines')
export class Machine extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // Unikalny w obrębie tenanta, nie globalnie — dwie fabryki mogą nazwać
  // maszynę tak samo (indeks idx_machines_tenant_machine_id).
  @Column({ name: 'machine_id', length: 100 })
  machineId: string;

  @Column({ length: 200 })
  name: string;

  // Miejsce maszyny w hierarchii Tenant → Site → Area. Pole `line` poniżej
  // zostaje jako swobodna etykieta linii dla zakładów, które nie modelują
  // obszarów; areaId jest wersją ustrukturyzowaną.
  @Column({ name: 'site_id', type: 'int', nullable: true })
  siteId: number | null;

  @Column({ name: 'area_id', type: 'int', nullable: true })
  areaId: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  line: string | null;

  @Column({ name: 'target_oee_pct', type: 'numeric', precision: 5, scale: 2, nullable: true })
  targetOeePct: number | null;

  // Domyślny czas cyklu wzorcowego (sekundy/szt.) używany do liczenia Performance
  // w OEE, gdy zlecenie nie ma własnego idealCycleTimeSec.
  @Column({
    name: 'default_ideal_cycle_time_sec',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  defaultIdealCycleTimeSec: number | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
