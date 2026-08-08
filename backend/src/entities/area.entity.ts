import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Obszar wewnątrz zakładu: linia produkcyjna, hala sortowni bagażu, strefa
// kompletacji. parentAreaId pozwala zagnieżdżać (terminal → hala → stanowisko)
// bez dokładania kolejnych tabel per branża.
@Entity('areas')
@Index('idx_areas_tenant', ['tenantId'])
@Index('idx_areas_site', ['siteId'])
export class Area {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column({ name: 'site_id' })
  siteId: number;

  @Column({ name: 'parent_area_id', type: 'int', nullable: true })
  parentAreaId: number | null;

  @Column({ length: 60 })
  code: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
