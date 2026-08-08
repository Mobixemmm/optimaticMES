import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  // Konfiguracja integracji to dostęp do haseł systemów zewnętrznych —
  // świadomie wyłącznie dla admina. Contributor i viewer nie dostają nawet
  // odczytu, bo lista połączeń zdradza topologię systemów klienta.
  admin: ['integrations.read', 'integrations.write', 'integrations.delete'],
};

export class CreateIntegrations1754000000017 implements MigrationInterface {
  name = 'CreateIntegrations1754000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'integration_connections',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'tenant_id', type: 'int' },
          { name: 'connector_key', type: 'varchar', length: '60' },
          { name: 'name', type: 'varchar', length: '120' },
          { name: 'enabled', type: 'boolean', default: false },
          { name: 'config', type: 'jsonb', default: `'{}'::jsonb` },
          { name: 'secrets_encrypted', type: 'text', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: `'unconfigured'` },
          { name: 'last_error', type: 'varchar', length: '500', isNullable: true },
          { name: 'last_sync_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'integration_connections',
      new TableIndex({
        name: 'idx_integration_connections_tenant',
        columnNames: ['tenant_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'integration_sync_logs',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'tenant_id', type: 'int' },
          { name: 'connection_id', type: 'int' },
          { name: 'operation', type: 'varchar', length: '20' },
          { name: 'status', type: 'varchar', length: '10' },
          { name: 'records_read', type: 'int', default: 0 },
          { name: 'records_written', type: 'int', default: 0 },
          { name: 'message', type: 'varchar', length: '500', isNullable: true },
          { name: 'duration_ms', type: 'int', default: 0 },
          { name: 'started_at', type: 'timestamp' },
        ],
        foreignKeys: [
          {
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['connection_id'],
            referencedTableName: 'integration_connections',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'integration_sync_logs',
      new TableIndex({
        name: 'idx_integration_sync_logs_tenant_conn',
        columnNames: ['tenant_id', 'connection_id'],
      }),
    );

    for (const [code, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      await queryRunner.query(
        `UPDATE "roles"
         SET "permissions" = "permissions" || $1::jsonb
         WHERE "code" = $2 AND "is_system" = true`,
        [JSON.stringify(permissions), code],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const allPermissions = [...new Set(Object.values(ROLE_PERMISSIONS).flat())];
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = (
         SELECT COALESCE(jsonb_agg(to_jsonb(perm)), '[]'::jsonb)
         FROM jsonb_array_elements_text("permissions") AS perm
         WHERE perm <> ALL($1::text[])
       )
       WHERE "permissions" ?| $1::text[]`,
      [allPermissions],
    );

    await queryRunner.dropTable('integration_sync_logs');
    await queryRunner.dropTable('integration_connections');
  }
}
