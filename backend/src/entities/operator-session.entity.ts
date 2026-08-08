import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';
import { Operator } from './operator.entity';

@Entity('operator_sessions')
export class OperatorSession extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  operatorId: number;

  @Column({ length: 100 })
  rfidCardId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  loginTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  logoutTime: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Operator)
  @JoinColumn({ name: 'operator_id' })
  operator: Operator;
}
