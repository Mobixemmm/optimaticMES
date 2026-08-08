import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

// Konfiguracja POJEDYNCZEJ maszyny. To jest brakujący poziom w drabinie
// ustawień: module_configs schodzi najniżej do zakładu (tenant → site), a panel
// operatorski potrzebuje rozdzielczości maszyny. Przy stu maszynach każda ma
// własny HMI i nie ma jednej odpowiedzi na pytanie „jakie kafelki pokazać" —
// prasa zgłasza odrzut z czujnika, stanowisko montażu z przycisku, a spawalnia
// w ogóle nie raportuje produkcji.
//
// Brak wiersza = maszyna działa na ustawieniach domyślnych modułu
// operatorPanel. Wiersz powstaje dopiero, gdy ktoś świadomie coś zmieni,
// więc dodanie maszyny do kartoteki nie wymaga jej najpierw konfigurować.
@Entity('machine_configs')
@Index('idx_machine_configs_unique', ['tenantId', 'machineId'], { unique: true })
export class MachineConfig extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // Ten sam identyfikator, którym posługuje się telemetria i kartoteka maszyn.
  // Bez FK — z tego samego powodu co w machine_data: maszyna może zgłosić się
  // wcześniej, niż ktoś ją opisze.
  @Column({ name: 'machine_id', length: 100 })
  machineId: string;

  // Klucze kafelków HMI włączonych na tej maszynie (PANEL_MODULES w kodzie).
  // null = użyj domyślnych z konfiguracji modułu operatorPanel; pusta tablica
  // to co innego — znaczy „ta maszyna świadomie nie ma żadnego kafelka".
  @Column({ name: 'panel_modules', type: 'jsonb', nullable: true })
  panelModules: string[] | null;

  // Ustawienia maszyny: scrapSource, scrapTag, scrapDefaultCategory.
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  config: Record<string, unknown>;

  // Kursor ingestu odrzutu z telemetrii. Licznik na maszynie jest narastający,
  // więc zdarzeniem jest PRZYROST — bez zapamiętanej poprzedniej wartości
  // każdy przebieg importowałby cały licznik od nowa.
  @Column({
    name: 'scrap_cursor_value',
    type: 'numeric',
    precision: 14,
    scale: 3,
    nullable: true,
  })
  scrapCursorValue: string | null;

  @Column({ name: 'scrap_cursor_at', type: 'timestamp', nullable: true })
  scrapCursorAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
