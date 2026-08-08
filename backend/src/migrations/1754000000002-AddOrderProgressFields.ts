import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderProgressFields1754000000002 implements MigrationInterface {
  name = 'AddOrderProgressFields1754000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('production_orders', [
      new TableColumn({
        name: 'producedQuantity',
        type: 'int',
        default: 0,
      }),
      new TableColumn({
        name: 'scrapQuantity',
        type: 'int',
        default: 0,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('production_orders', [
      'producedQuantity',
      'scrapQuantity',
    ]);
  }
}
