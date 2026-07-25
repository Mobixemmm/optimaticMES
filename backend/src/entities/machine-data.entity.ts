import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('machine_data')
export class MachineData {
    @PrimaryColumn({ type: 'timestamp with time zone' })
    time: Date;

    @PrimaryColumn({ type: 'text' })
    machine_id: string;

    @PrimaryColumn({ type: 'text' })
    tag_name: string;

    @Column({ type: 'double precision', nullable: true })
    value_num: number | null;

    @Column({ type: 'boolean', nullable: true })
    value_bool: boolean | null;

    @Column({ type: 'text', nullable: true })
    value_text: string | null;
}