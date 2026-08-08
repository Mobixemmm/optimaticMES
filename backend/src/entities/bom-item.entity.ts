import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

// Pozycja receptury: ile danego materiału wchodzi w JEDNĄ sztukę wyrobu.
// Kluczem jest nazwa produktu, bo zlecenie (ProductionOrder.productName) też
// nie ma jeszcze osobnej encji produktu — receptura celowo trzyma się tego
// samego klucza, żeby nie tworzyć drugiego, rozjeżdżającego się słownika.
@Entity('bom_items')
@Index('idx_bom_items_tenant_product_material', ['tenantId', 'productName', 'inventoryItemId'], {
  unique: true,
})
export class BomItem extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_name', length: 200 })
  productName: string;

  @Column({ name: 'inventory_item_id' })
  inventoryItemId: number;

  // Zużycie na jedną sztukę wyrobu. Cztery miejsca po przecinku, bo materiały
  // typu klej czy lakier liczy się w setnych grama na sztukę.
  @Column({ name: 'quantity_per', type: 'numeric', precision: 12, scale: 4 })
  quantityPer: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
