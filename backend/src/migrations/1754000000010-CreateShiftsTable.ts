import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateShiftsTable1754000000010 implements MigrationInterface {
  name = 'CreateShiftsTable1754000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'shifts',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'day_of_week', type: 'smallint' },
          { name: 'start_time', type: 'varchar', length: '5' },
          { name: 'end_time', type: 'varchar', length: '5' },
          { name: 'is_active', type: 'boolean', default: true },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Domyślny kalendarz: dwie zmiany, pon-pt, żeby analityka OEE od razu
    // liczyła sensowną dostępność zamiast zakładać pracę 24/7. Do skorygowania
    // przez admina (CRUD /shifts) pod realny harmonogram zakładu.
    for (let day = 1; day <= 5; day++) {
      await queryRunner.query(
        `INSERT INTO shifts (name, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)`,
        ['Zmiana I', day, '06:00', '14:00'],
      );
      await queryRunner.query(
        `INSERT INTO shifts (name, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)`,
        ['Zmiana II', day, '14:00', '22:00'],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('shifts');
  }
}
