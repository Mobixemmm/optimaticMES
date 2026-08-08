import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Rola żyje w bazie, nie w unii typów w kodzie — klient może dodać własną
// ("Brygadzista zmiany B z dostępem tylko do hali 2") bez deployu. Kod pyta
// wyłącznie o uprawnienia (@RequirePermission), nigdy o nazwę roli.
@Entity('roles')
@Index('idx_roles_tenant_code', ['tenantId', 'code'], { unique: true })
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column({ length: 60 })
  code: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 400, nullable: true })
  description: string | null;

  // Lista kluczy z PERMISSIONS (auth/permissions.constants.ts).
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  permissions: string[];

  // null = wszystkie zakłady tenanta. Tablica ogranicza rolę do wskazanych
  // zakładów — patrz assertSiteAllowed() w common/request-context.ts.
  @Column({ name: 'site_scope', type: 'jsonb', nullable: true })
  siteScope: number[] | null;

  // Role systemowe (admin/contributor/viewer/guest) można edytować, ale nie
  // usunąć — bez nich nie dałoby się odzyskać dostępu po błędnej konfiguracji.
  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
