import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIdealCycleTimeToOrders1754000000009
  implements MigrationInterface
{
  name = 'AddIdealCycleTimeToOrders1754000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'production_orders',
      new TableColumn({
        name: 'idealCycleTimeSec',
        type: 'numeric',
        precision: 10,
        scale: 2,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('production_orders', 'idealCycleTimeSec');
  }
}
