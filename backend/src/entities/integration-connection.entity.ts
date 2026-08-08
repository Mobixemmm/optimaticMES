import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

export type ConnectionStatus = 'unconfigured' | 'ok' | 'error';

// Wybrane przez klienta połączenie z systemem zewnętrznym. Klient może mieć
// kilka naraz (np. ERP na zlecenia i osobny WMS na materiały), stąd tabela,
// a nie pojedynczy wiersz konfiguracji.
@Entity('integration_connections')
@Index('idx_integration_connections_tenant', ['tenantId'])
export class IntegrationConnection extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // Klucz z CONNECTOR_DEFINITIONS — mówi, którego sterownika użyć.
  @Column({ name: 'connector_key', length: 60 })
  connectorKey: string;

  @Column({ length: 120 })
  name: string;

  @Column({ default: false })
  enabled: boolean;

  // Pola jawne: adresy, ścieżki, mapowanie. Bezpieczne do pokazania w UI.
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  config: Record<string, unknown>;

  // Zaszyfrowany worek na hasła i klucze API (SecretCipherService). Nigdy nie
  // opuszcza backendu w postaci jawnej — kontroler zwraca wyłącznie maskę.
  @Column({ name: 'secrets_encrypted', type: 'text', nullable: true })
  secretsEncrypted: string | null;

  @Column({ type: 'varchar', length: 20, default: 'unconfigured' })
  status: ConnectionStatus;

  @Column({ name: 'last_error', type: 'varchar', length: 500, nullable: true })
  lastError: string | null;

  @Column({ name: 'last_sync_at', type: 'timestamp', nullable: true })
  lastSyncAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
