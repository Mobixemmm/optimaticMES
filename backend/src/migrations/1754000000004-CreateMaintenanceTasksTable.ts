import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMaintenanceTasksTable1754000000004
  implements MigrationInterface
{
  name = 'CreateMaintenanceTasksTable1754000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'maintenance_tasks',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          {
            name: 'task_number',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          { name: 'asset', type: 'varchar', length: '150' },
          { name: 'type', type: 'varchar', length: '150' },
          { name: 'due_date', type: 'timestamp' },
          { name: 'technician', type: 'varchar', length: '150' },
          { name: 'priority', type: 'varchar', length: '20', default: "'medium'" },
          { name: 'status', type: 'varchar', length: '20', default: "'open'" },
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
    await queryRunner.dropTable('maintenance_tasks');
  }
}
