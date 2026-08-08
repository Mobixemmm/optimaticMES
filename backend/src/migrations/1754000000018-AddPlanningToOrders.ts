import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['planning.read', 'planning.write'],
  contributor: ['planning.read', 'planning.write'],
  viewer: ['planning.read'],
};

export class AddPlanningToOrders1754000000018 implements MigrationInterface {
  name = 'AddPlanningToOrders1754000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Zlecenie dostaje wreszcie maszynę. Ten brak ciągnął się przez cały model:
    // bez niego genealogia nie wiedziała, gdzie powstał wyrób, OEE liczyło się
    // tylko zbiorczo, a analiza przyczyn nie mogła powiedzieć "braki rosną na
    // prasie 3". Świadomie varchar, a nie FK do machines.id — telemetria i
    // przestoje też adresują maszynę po `machine_id`, więc trzymamy jeden klucz.
    await queryRunner.addColumn(
      'production_orders',
      new TableColumn({
        name: 'machine_id',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );

    // Kolejność w kolejce danej maszyny. NULL = niezaplanowane.
    await queryRunner.addColumn(
      'production_orders',
      new TableColumn({
        name: 'sequence',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.createIndex(
      'production_orders',
      new TableIndex({
        name: 'idx_production_orders_tenant_machine',
        columnNames: ['tenant_id', 'machine_id'],
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

    await queryRunner.dropIndex('production_orders', 'idx_production_orders_tenant_machine');
    await queryRunner.dropColumn('production_orders', 'sequence');
    await queryRunner.dropColumn('production_orders', 'machine_id');
  }
}
