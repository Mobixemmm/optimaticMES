import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

export type MaintenancePriority = 'critical' | 'high' | 'medium' | 'low';
export type MaintenanceStatus = 'open' | 'in_progress' | 'done';

@Entity('maintenance_tasks')
export class MaintenanceTask extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'task_number', length: 50, unique: true })
  taskNumber: string;

  @Column({ length: 150 })
  asset: string;

  @Column({ length: 150 })
  type: string;

  @Column({ name: 'due_date', type: 'timestamp' })
  dueDate: Date;

  @Column({ length: 150 })
  technician: string;

  @Column({ type: 'varchar', length: 20, default: 'medium' })
  priority: MaintenancePriority;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: MaintenanceStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
