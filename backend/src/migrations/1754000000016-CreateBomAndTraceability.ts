import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['bom.read', 'bom.write', 'bom.delete', 'traceability.read'],
  contributor: ['bom.read', 'bom.write', 'traceability.read'],
  viewer: ['bom.read', 'traceability.read'],
};

export class CreateBomAndTraceability1754000000016 implements MigrationInterface {
  name = 'CreateBomAndTraceability1754000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bom_items',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'tenant_id', type: 'int' },
          { name: 'product_name', type: 'varchar', length: '200' },
          { name: 'inventory_item_id', type: 'int' },
          { name: 'quantity_per', type: 'numeric', precision: 12, scale: 4 },
          { name: 'notes', type: 'varchar', length: '255', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          // Materiał wycofany z kartoteki nie może zostawić po sobie pozycji
          // receptury wskazującej w próżnię.
          {
            columnNames: ['inventory_item_id'],
            referencedTableName: 'inventory_items',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'bom_items',
      new TableIndex({
        name: 'idx_bom_items_tenant_product_material',
        columnNames: ['tenant_id', 'product_name', 'inventory_item_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'material_consumptions',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'tenant_id', type: 'int' },
          { name: 'order_id', type: 'int' },
          { name: 'inventory_item_id', type: 'int' },
          { name: 'batch_number', type: 'varchar', length: '100' },
          { name: 'quantity', type: 'numeric', precision: 12, scale: 2 },
          { name: 'consumed_at', type: 'timestamp' },
          { name: 'consumed_by', type: 'varchar', length: '120', isNullable: true },
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
          {
            columnNames: ['order_id'],
            referencedTableName: 'production_orders',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          // Wydania NIE znikają razem z kartoteką materiału — RESTRICT, bo
          // skasowanie surowca nie może wymazać dowodu, że wszedł do wyrobu.
          // To jest dokładnie ten zapis, którego szuka się przy wycofaniu partii.
          {
            columnNames: ['inventory_item_id'],
            referencedTableName: 'inventory_items',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'material_consumptions',
      new TableIndex({
        name: 'idx_material_consumptions_tenant_order',
        columnNames: ['tenant_id', 'order_id'],
      }),
    );
    await queryRunner.createIndex(
      'material_consumptions',
      new TableIndex({
        name: 'idx_material_consumptions_tenant_batch',
        columnNames: ['tenant_id', 'batch_number'],
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

    await queryRunner.dropTable('material_consumptions');
    await queryRunner.dropTable('bom_items');
  }
}
