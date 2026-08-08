import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAuditLogsTable1754000000011 implements MigrationInterface {
  name = 'CreateAuditLogsTable1754000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'user_id', type: 'int', isNullable: true },
          { name: 'user_email', type: 'varchar', length: '200', isNullable: true },
          { name: 'method', type: 'varchar', length: '10' },
          { name: 'path', type: 'varchar', length: '300' },
          { name: 'status_code', type: 'int' },
          { name: 'body', type: 'jsonb', isNullable: true },
          { name: 'ip', type: 'varchar', length: '64', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({ name: 'idx_audit_logs_created_at', columnNames: ['created_at'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_logs');
  }
}
