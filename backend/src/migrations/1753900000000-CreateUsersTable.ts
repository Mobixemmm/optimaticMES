import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1753900000000 implements MigrationInterface {
  name = 'CreateUsersTable1753900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'email', type: 'varchar', length: '200', isUnique: true },
          { name: 'password_hash', type: 'varchar', length: '100' },
          { name: 'name', type: 'varchar', length: '150' },
          { name: 'role', type: 'varchar', length: '20', default: "'viewer'" },
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
