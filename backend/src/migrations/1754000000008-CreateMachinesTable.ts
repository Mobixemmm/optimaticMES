import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMachinesTable1754000000008 implements MigrationInterface {
  name = 'CreateMachinesTable1754000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'machines',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'machine_id', type: 'varchar', length: '100', isUnique: true },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'line', type: 'varchar', length: '100', isNullable: true },
          {
            name: 'target_oee_pct',
            type: 'numeric',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'default_ideal_cycle_time_sec',
            type: 'numeric',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          { name: 'is_active', type: 'boolean', default: true },
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
    await queryRunner.createIndex(
      'machines',
      new TableIndex({ name: 'idx_machines_machine_id', columnNames: ['machine_id'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('machines');
  }
}
