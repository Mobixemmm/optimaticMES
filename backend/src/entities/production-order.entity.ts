import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

@Entity('production_orders')
export class ProductionOrder {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 50, unique: true })
    orderNumber: string;

    @Column({ length: 200 })
    productName: string;

    @Column()
    quantity: number;

    @Column({
        type: 'varchar',
        length: 20,
        default: 'pending'
    })
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';

    @Column({ type: 'timestamp', nullable: true })
    plannedStart: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    actualStart: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    actualEnd: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}