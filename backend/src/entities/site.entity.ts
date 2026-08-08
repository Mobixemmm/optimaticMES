import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Zakład / lokalizacja: hala produkcyjna, terminal lotniska, magazyn. Drugi
// poziom hierarchii ISA-95 (Tenant → Site → Area → maszyna/zasób).
@Entity('sites')
@Index('idx_sites_tenant', ['tenantId'])
@Index('idx_sites_tenant_code', ['tenantId', 'code'], { unique: true })
export class Site {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column({ length: 60 })
  code: string;

  @Column({ length: 200 })
  name: string;

  // Strefa czasowa zakładu — zmiany i raporty dobowe muszą się liczyć w czasie
  // lokalnym zakładu, nie serwera (sieć magazynów bywa w kilku strefach).
  @Column({ length: 60, default: 'Europe/Warsaw' })
  timezone: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
