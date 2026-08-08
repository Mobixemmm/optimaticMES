import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

// Nowe uprawnienia trzeba dopisać do ról, które już siedzą w bazie — sam wpis
// w permissions.constants.ts niczego nie nadaje, bo role są danymi, nie kodem
// (patrz encja Role). Role dodane ręcznie przez klienta zostawiamy w spokoju.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['quality.read', 'quality.write', 'quality.delete'],
  contributor: ['quality.read', 'quality.write'],
  viewer: ['quality.read'],
};

export class CreateQualityDefectsTable1754000000015 implements MigrationInterface {
  name = 'CreateQualityDefectsTable1754000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'quality_defects',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'tenant_id', type: 'int' },
          { name: 'order_id', type: 'int' },
          { name: 'machine_id', type: 'varchar', length: '100', isNullable: true },
          { name: 'defect_code', type: 'varchar', length: '20' },
          { name: 'quantity', type: 'int' },
          { name: 'disposition', type: 'varchar', length: '10' },
          { name: 'status', type: 'varchar', length: '10', default: `'open'` },
          { name: 'detected_by', type: 'varchar', length: '120', isNullable: true },
          { name: 'detected_at', type: 'timestamp' },
          { name: 'resolved_at', type: 'timestamp', isNullable: true },
          { name: 'notes', type: 'varchar', length: '255', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          // Skasowanie zlecenia zabiera ze sobą jego karty wad — osierocone
          // braki nie miałyby do czego doliczać wskaźnika jakości.
          {
            columnNames: ['order_id'],
            referencedTableName: 'production_orders',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'quality_defects',
      new TableIndex({ name: 'idx_quality_defects_tenant', columnNames: ['tenant_id'] }),
    );
    // Pareto wad i przeliczanie braków zawsze schodzą po zleceniu.
    await queryRunner.createIndex(
      'quality_defects',
      new TableIndex({
        name: 'idx_quality_defects_tenant_order',
        columnNames: ['tenant_id', 'order_id'],
      }),
    );

    for (const [code, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      await queryRunner.query(
        `UPDATE "roles"
         SET "permissions" = "permissions" || $1::jsonb
         WHERE "code" = $2 AND "is_system" = true`,
        [JSON.stringify(permissions), code],
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

    await queryRunner.dropTable('quality_defects');
  }
}
