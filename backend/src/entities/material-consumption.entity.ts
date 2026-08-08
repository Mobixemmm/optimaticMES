import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

// Faktyczne wydanie materiału na zlecenie — rdzeń genealogii. Receptura mówi,
// co POWINNO wejść; ten wpis zapisuje, co NAPRAWDĘ weszło i z której partii
// dostawcy. Bez numeru partii cała genealogia jest bezużyteczna przy wycofaniu
// wadliwego surowca, dlatego batchNumber jest wymagany.
@Entity('material_consumptions')
@Index('idx_material_consumptions_tenant_order', ['tenantId', 'orderId'])
// Wyszukiwanie wstecz ("która partia trafiła do których zleceń") to ścieżka
// recall — musi być indeksowana, bo idzie po numerze partii, nie po zleceniu.
@Index('idx_material_consumptions_tenant_batch', ['tenantId', 'batchNumber'])
export class MaterialConsumption extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  orderId: number;

  @Column({ name: 'inventory_item_id' })
  inventoryItemId: number;

  @Column({ name: 'batch_number', length: 100 })
  batchNumber: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  quantity: number;

  @Column({ name: 'consumed_at', type: 'timestamp' })
  consumedAt: Date;

  @Column({ name: 'consumed_by', type: 'varchar', length: 120, nullable: true })
  consumedBy: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
