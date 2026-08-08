import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

@Entity('sensor_data')
export class SensorData extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  sensorName: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  value: number;

  @Column({ length: 20 })
  unit: string;

  @Column({ length: 100 })
  location: string;

  @CreateDateColumn()
  timestamp: Date;
}
