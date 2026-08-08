import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateInventoryItemsTable1754000000003
  implements MigrationInterface
{
  name = 'CreateInventoryItemsTable1754000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'inventory_items',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'code', type: 'varchar', length: '50', isUnique: true },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'stock', type: 'numeric', precision: 12, scale: 2, default: 0 },
          { name: 'unit', type: 'varchar', length: '20' },
          {
            name: 'min_stock',
            type: 'numeric',
            precision: 12,
            scale: 2,
            default: 0,
          },
          { name: 'category', type: 'varchar', length: '100', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('inventory_items');
  }
}
