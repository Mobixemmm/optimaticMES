import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Następca tabeli feature_flags. Różnica jest zasadnicza: flaga umiała tylko
// on/off i była globalna, a wpis modułu niesie też etykietę (fabryka: "Zlecenia",
// lotnisko: "Loty", magazyn: "Awizacje"), ikonę, kolejność w menu, wymagane
// uprawnienie i dowolną konfigurację w `config`. Dzięki temu nowy klient to
// wiersze w bazie, a nie nowa flaga + deploy backendu i frontendu.
@Entity('module_configs')
@Index('idx_module_configs_tenant', ['tenantId'])
@Index('idx_module_configs_unique', ['tenantId', 'siteId', 'moduleKey'], {
  unique: true,
})
export class ModuleConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  // null = ustawienie dla całego klienta; wypełnione = nadpisanie dla jednego
  // zakładu (magazyn w Gdańsku ma moduł "Kompletacja", w Krakowie nie).
  @Column({ name: 'site_id', type: 'int', nullable: true })
  siteId: number | null;

  @Column({ name: 'module_key', length: 60 })
  moduleKey: string;

  @Column({ default: true })
  enabled: boolean;

  // null = użyj domyślnej etykiety z rejestru modułów w kodzie.
  @Column({ type: 'varchar', length: 120, nullable: true })
  label: string | null;

  // Nazwa ikony z lucide-react; frontend mapuje ją przez własny rejestr ikon,
  // więc baza nie przechowuje kodu ani SVG.
  @Column({ type: 'varchar', length: 60, nullable: true })
  icon: string | null;

  @Column({ name: 'sort_order', default: 100 })
  sortOrder: number;

  // Uprawnienie wymagane do zobaczenia modułu. null = wystarczy zalogowanie.
  @Column({ name: 'required_permission', type: 'varchar', length: 60, nullable: true })
  requiredPermission: string | null;

  // Ustawienia specyficzne dla modułu — progi, domyślne filtry, widoczne kolumny.
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  config: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
