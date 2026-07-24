import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('operators')
export class Operator {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    firstName: string;

    @Column({ length: 100 })
    lastName: string;

    @Column({ length: 50, unique: true })
    rfidCardId: string;  // numer karty RFID

    @Column({ length: 20, nullable: true })
    pinCode: string;     // opcjonalny PIN zapasowy

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;
}