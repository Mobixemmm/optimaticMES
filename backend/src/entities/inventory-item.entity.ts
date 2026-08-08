import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

@Entity('inventory_items')
export class InventoryItem extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  stock: number;

  @Column({ length: 20 })
  unit: string;

  @Column({ name: 'min_stock', type: 'numeric', precision: 12, scale: 2, default: 0 })
  minStock: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
