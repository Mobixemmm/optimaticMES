import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAndonAlertsTable1754000000005 implements MigrationInterface {
  name = 'CreateAndonAlertsTable1754000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'andon_alerts',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'type', type: 'varchar', length: '50' },
          { name: 'machine_id', type: 'varchar', length: '100', isNullable: true },
          { name: 'message', type: 'varchar', length: '255' },
          { name: 'tone', type: 'varchar', length: '20', default: "'info'" },
          { name: 'is_resolved', type: 'boolean', default: false },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          { name: 'resolved_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('andon_alerts');
  }
}
