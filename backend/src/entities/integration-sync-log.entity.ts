import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

export type SyncOperation = 'test' | 'pull_orders' | 'pull_materials' | 'push_progress';
export type SyncStatus = 'success' | 'error';

// Dziennik synchronizacji. Bez niego integracja jest czarną skrzynką: przy
// rozbieżności między ERP a MES pierwsze pytanie brzmi "co i kiedy weszło",
// a odpowiedź musi być w systemie, nie w logach serwera.
@Entity('integration_sync_logs')
@Index('idx_integration_sync_logs_tenant_conn', ['tenantId', 'connectionId'])
export class IntegrationSyncLog extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'connection_id' })
  connectionId: number;

  @Column({ type: 'varchar', length: 20 })
  operation: SyncOperation;

  @Column({ type: 'varchar', length: 10 })
  status: SyncStatus;

  @Column({ name: 'records_read', type: 'int', default: 0 })
  recordsRead: number;

  @Column({ name: 'records_written', type: 'int', default: 0 })
  recordsWritten: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  message: string | null;

  @Column({ name: 'duration_ms', type: 'int', default: 0 })
  durationMs: number;

  @Column({ name: 'started_at', type: 'timestamp' })
  startedAt: Date;
}
