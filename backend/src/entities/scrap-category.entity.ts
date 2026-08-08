import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

// Katalog przyczyn odrzutu. Cennikowa pozycja mówi „rejestracja i KATEGORYZACJA
// odrzutu" — bez katalogu zostaje sama liczba sztuk, z której nie wynika, co
// poprawić. Kategorie są danymi klienta, nie unią w kodzie: odlewnia ma inne
// przyczyny braków niż montaż elektroniki.
@Entity('scrap_categories')
@Index('idx_scrap_categories_unique', ['tenantId', 'code'], { unique: true })
export class ScrapCategory extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 40 })
  code: string;

  @Column({ length: 120 })
  label: string;

  // Grupa nadrzędna do raportu Pareto (materiał / maszyna / człowiek / metoda).
  @Column({ type: 'varchar', length: 60, nullable: true })
  group: string | null;

  @Column({ name: 'sort_order', default: 100 })
  sortOrder: number;

  // Kategoria wycofana zostaje w bazie, żeby historyczne zdarzenia nie straciły
  // opisu — znika tylko z przycisków w panelu operatora.
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
