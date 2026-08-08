import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMachineStopEventsTable1754000000006
  implements MigrationInterface
{
  name = 'CreateMachineStopEventsTable1754000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'machine_stop_events',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'machine_id', type: 'varchar', length: '100' },
          { name: 'reason', type: 'varchar', length: '20' },
          { name: 'start_time', type: 'timestamp' },
          { name: 'end_time', type: 'timestamp', isNullable: true },
          { name: 'notes', type: 'varchar', length: '255', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('machine_stop_events');
  }
}
