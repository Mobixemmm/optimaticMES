import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// Klient systemu — fabryka, port lotniczy, operator magazynów. Wszystkie dane
// domenowe (zlecenia, maszyny, operatorzy...) niosą tenant_id i są filtrowane
// przez tenantScope() z common/request-context.ts.
@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 60, unique: true })
  slug: string;

  @Column({ length: 200 })
  name: string;

  // Kod pakietu branżowego, z którego wyszła konfiguracja tego klienta
  // ('factory' | 'airport' | 'warehouse' | ...). Sam pakiet to tylko punkt
  // startowy — po zaimportowaniu wszystko jest edytowalne w panelu admina.
  @Column({ name: 'industry_pack', length: 60, nullable: true, type: 'varchar' })
  industryPack: string | null;

  // Nadpisania nazewnictwa dla tej branży: { "workItem": "Lot", "asset": "Stanowisko" }.
  // Frontend czyta to z /bootstrap i renderuje etykiety zamiast stałych z kodu.
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  terminology: Record<string, string>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
