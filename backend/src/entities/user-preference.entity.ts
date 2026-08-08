import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

// Ustawienie należące do JEDNEGO użytkownika, nie do klienta i nie do modułu.
// Granica jest ostra: module_configs mówi "u tego klienta zlecenia nazywają się
// Loty" i dotyczy wszystkich, a tutaj siedzi to, co jedna osoba zmieniła
// wyłącznie dla siebie — jak kolory legendy na wykresach analityki. Dlatego
// klucz obejmuje user_id i dlatego wiersz ginie razem z użytkownikiem.
//
// Kolumna `value` jest jsonb, a nie tekstem: kolejna preferencja (układ kolumn,
// domyślny zakres dat) nie wymaga migracji, tylko nowego klucza. Kształt
// wartości waliduje PreferencesService przy zapisie — baza go nie pilnuje.
@Entity('user_preferences')
@Index('idx_user_preferences_unique', ['tenantId', 'userId', 'key'], {
  unique: true,
})
export class UserPreference extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  // Nazwa preferencji z katalogu PREFERENCE_KEYS — nie dowolny string.
  @Column({ length: 60 })
  key: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  value: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
