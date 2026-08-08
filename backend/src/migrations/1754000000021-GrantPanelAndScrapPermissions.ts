import { MigrationInterface, QueryRunner } from 'typeorm';

// Role trzymają w bazie WYLICZONĄ listę uprawnień, a nie regułę — nowe
// uprawnienie w kodzie nie trafia więc do nikogo samo z siebie. Bez tej migracji
// panel operatorski i moduł SCRAP odpowiadałyby 403 nawet administratorowi,
// który przecież przed chwilą je zobaczył w menu.
//
// Podział jest celowy: operator przy maszynie ma zgłaszać odrzut, ale nie
// decydować, jakie kafelki stoją na HMI ani co jest w katalogu przyczyn —
// to są decyzje wdrożeniowe, nie zmianowe.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'panel.read',
    'panel.configure',
    'scrap.read',
    'scrap.report',
    'scrap.delete',
    'scrap.categories.write',
  ],
  contributor: ['panel.read', 'scrap.read', 'scrap.report'],
  viewer: ['panel.read', 'scrap.read'],
};

export class GrantPanelAndScrapPermissions1754000000021
  implements MigrationInterface
{
  name = 'GrantPanelAndScrapPermissions1754000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [code, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      // Doklejenie bez deduplikacji zrobiłoby duplikaty przy ponownym
      // uruchomieniu, więc najpierw usuwamy te uprawnienia z listy, potem
      // dodajemy — dzięki temu migracja jest idempotentna.
      await queryRunner.query(
        `UPDATE "roles"
         SET "permissions" = (
           SELECT COALESCE(jsonb_agg(to_jsonb(perm)), '[]'::jsonb)
           FROM jsonb_array_elements_text("permissions") AS perm
           WHERE perm <> ALL($1::text[])
         ) || $2::jsonb
         WHERE "code" = $3 AND "is_system" = true`,
        [permissions, JSON.stringify(permissions), code],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const allPermissions = [...new Set(Object.values(ROLE_PERMISSIONS).flat())];
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = (
         SELECT COALESCE(jsonb_agg(to_jsonb(perm)), '[]'::jsonb)
         FROM jsonb_array_elements_text("permissions") AS perm
         WHERE perm <> ALL($1::text[])
       )
       WHERE "permissions" ?| $1::text[]`,
      [allPermissions],
    );
  }
}
