import { Column } from 'typeorm';

// Klasa bazowa dla encji należących do konkretnego klienta. Dziedziczenie zamiast
// kopiowania kolumny do dwunastu plików daje jeszcze jedno: typ TenantOwnedEntity
// pozwala serwisom i testom wymusić, że repozytorium w ogóle *ma* tenant_id
// (patrz TenantScopedRepository w common/tenant-scoped.repository.ts).
export abstract class TenantOwnedEntity {
  @Column({ name: 'tenant_id' })
  tenantId: number;
}
