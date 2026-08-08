import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { TenantOwnedEntity } from './tenant-owned.entity';

// Kto/kiedy/co zmienił — zapisywane automatycznie przez AuditInterceptor dla
// każdego mutującego żądania (POST/PUT/PATCH/DELETE). userId nie ma FK celowo:
// wpis audytu musi przetrwać usunięcie użytkownika.
@Entity('audit_logs')
export class AuditLog extends TenantOwnedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Column({ name: 'user_email', type: 'varchar', length: 200, nullable: true })
  userEmail: string | null;

  @Column({ length: 10 })
  method: string;

  @Column({ length: 300 })
  path: string;

  @Column({ name: 'status_code', type: 'int' })
  statusCode: number;

  // Ciało żądania z odfiltrowanymi polami wrażliwymi (hasła, PIN-y, tokeny) — patrz sanitizeBody().
  @Column({ type: 'jsonb', nullable: true })
  body: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
