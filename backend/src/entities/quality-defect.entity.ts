import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

// Karta wady — pojedyncze zgłoszenie niezgodności na zleceniu. Zastępuje
// wpisywanie `scrapQuantity` z palca: braki powstają teraz z sumy kart, więc
// wskaźnik Quality w OEE ma za sobą listę konkretnych zdarzeń, a nie jedną
// liczbę bez uzasadnienia (patrz QualityService.create).
export type DefectCode =
  | 'dimension'
  | 'surface'
  | 'material'
  | 'assembly'
  | 'contamination'
  | 'labeling'
  | 'other';

// Decyzja jakościowa: brak nie do uratowania (scrap) albo sztuka do poprawki
// (rework). Rework dopiero po naprawie rozstrzyga się na 'reworked' lub
// 'scrapped' — dopóki trwa, nie obciąża wskaźnika jakości.
export type DefectDisposition = 'scrap' | 'rework';

export type DefectStatus = 'open' | 'reworked' | 'scrapped';

@Entity('quality_defects')
export class QualityDefect extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  orderId: number;

  @Column({ name: 'machine_id', type: 'varchar', length: 100, nullable: true })
  machineId: string | null;

  @Column({ name: 'defect_code', type: 'varchar', length: 20 })
  defectCode: DefectCode;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'varchar', length: 10 })
  disposition: DefectDisposition;

  @Column({ type: 'varchar', length: 10, default: 'open' })
  status: DefectStatus;

  @Column({ name: 'detected_by', type: 'varchar', length: 120, nullable: true })
  detectedBy: string | null;

  @Column({ name: 'detected_at', type: 'timestamp' })
  detectedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
