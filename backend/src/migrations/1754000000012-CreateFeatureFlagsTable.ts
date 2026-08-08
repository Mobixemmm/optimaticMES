import { MigrationInterface, QueryRunner, Table } from 'typeorm';

const DEFAULT_FLAG_KEYS = [
  'SHOW_MACHINES_TAB',
  'ENABLE_TEMPERATURE_STREAM',
  'ENABLE_OPERATOR_PANEL',
  'ENABLE_ADD_MACHINE_BTN',
  'SHOW_ORDERS_TAB',
  'ALLOW_ORDER_CREATE',
  'ALLOW_ORDER_STATUS_CHANGE',
  'ALLOW_ORDER_DELETE',
  'SHOW_KPI_CARDS',
  'SHOW_OEE_CHART',
  'SHOW_SHIFT_TILE',
  'SHOW_MAINTENANCE_TAB',
  'SHOW_OPERATORS_TAB',
  'SHOW_ANALYTICS_TAB',
  'SHOW_INVENTORY_TAB',
];

export class CreateFeatureFlagsTable1754000000012 implements MigrationInterface {
  name = 'CreateFeatureFlagsTable1754000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'feature_flags',
        columns: [
          { name: 'key', type: 'varchar', length: '100', isPrimary: true },
          { name: 'enabled', type: 'boolean', default: true },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    for (const key of DEFAULT_FLAG_KEYS) {
      await queryRunner.query(
        `INSERT INTO feature_flags ("key", enabled) VALUES ($1, true)`,
        [key],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('feature_flags');
  }
}
