import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOperatorProfileFields1754000000001 implements MigrationInterface {
  name = 'AddOperatorProfileFields1754000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('operators', [
      new TableColumn({
        name: 'role',
        type: 'varchar',
        length: '100',
        default: "'Operator'",
      }),
      new TableColumn({
        name: 'station',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
      new TableColumn({
        name: 'shift',
        type: 'varchar',
        length: '20',
        default: "'I'",
      }),
      new TableColumn({
        name: 'efficiencyPct',
        type: 'numeric',
        precision: 5,
        scale: 2,
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('operators', [
      'role',
      'station',
      'shift',
      'efficiencyPct',
    ]);
  }
}
