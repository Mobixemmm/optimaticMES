import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

// Tabele domenowe, które dostają tenant_id. machine_data świadomie NIE jest na
// liście — to hypertable TimescaleDB zapisywany przez gateway po samym stringu
// machine_id, więc telemetrię zawężamy przez join z `machines` (patrz
// MachineDataService), a nie przez ALTER na tabeli szeregów czasowych.
const TENANT_SCOPED_TABLES = [
  'production_orders',
  'operators',
  'operator_sessions',
  'sensor_data',
  'machines',
  'inventory_items',
  'maintenance_tasks',
  'andon_alerts',
  'machine_stop_events',
  'shifts',
  'audit_logs',
  'users',
];

// Kolumny, które były globalnie UNIQUE, a przy wielu klientach muszą być
// unikalne tylko w obrębie tenanta — dwie fabryki mogą mieć zlecenie "ZP-001".
const SCOPED_UNIQUE_COLUMNS: { table: string; column: string }[] = [
  { table: 'production_orders', column: 'orderNumber' },
  { table: 'operators', column: 'rfidCardId' },
  { table: 'machines', column: 'machine_id' },
];

// Nazwy ograniczeń UNIQUE generuje TypeORM (UQ_<hash>), więc nie da się ich
// bezpiecznie wpisać na sztywno — znajdujemy je po kolumnie i zdejmujemy.
function dropSingleColumnUniqueSql(table: string, column: string): string {
  return `
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = current_schema()
          AND rel.relname = '${table}'
          AND con.contype = 'u'
          AND array_length(con.conkey, 1) = 1
          AND (
            SELECT attname FROM pg_attribute
            WHERE attrelid = rel.oid AND attnum = con.conkey[1]
          ) = '${column}'
      LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', '${table}', r.conname);
      END LOOP;

      -- Unikalne indeksy bez powiązanego ograniczenia (np. tworzone ręcznie).
      FOR r IN
        SELECT idx.relname AS conname
        FROM pg_index i
        JOIN pg_class idx ON idx.oid = i.indexrelid
        JOIN pg_class rel ON rel.oid = i.indrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = current_schema()
          AND rel.relname = '${table}'
          AND i.indisunique
          AND NOT i.indisprimary
          AND i.indnatts = 1
          AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = i.indexrelid)
          AND (
            SELECT attname FROM pg_attribute
            WHERE attrelid = rel.oid AND attnum = i.indkey[0]
          ) = '${column}'
      LOOP
        EXECUTE format('DROP INDEX %I', r.conname);
      END LOOP;
    END $$;
  `;
}

const SYSTEM_ROLES: {
  code: string;
  name: string;
  description: string;
  permissions: string[];
}[] = [
  {
    code: 'admin',
    name: 'Administrator',
    description: 'Pełny dostęp, w tym konfiguracja modułów, ról i zakładów',
    // Wypisane jawnie, a nie przez import ALL_PERMISSIONS — migracja jest
    // snapshotem stanu z chwili jej powstania i nie może się zmieniać, gdy
    // ktoś doda nowe uprawnienie do katalogu w kodzie.
    permissions: [
      'orders.read', 'orders.create', 'orders.update', 'orders.delete',
      'machines.read', 'machines.write', 'machines.control',
      'operators.read', 'operators.write',
      'inventory.read', 'inventory.write', 'inventory.delete',
      'maintenance.read', 'maintenance.write', 'maintenance.delete',
      'andon.read', 'andon.report', 'andon.resolve', 'andon.delete',
      'sensors.read', 'analytics.read',
      'shifts.read', 'shifts.write',
      'audit.read',
      'settings.read', 'settings.write',
      'users.read', 'users.write',
      'roles.read', 'roles.write',
      'tenancy.read', 'tenancy.write',
    ],
  },
  {
    code: 'contributor',
    name: 'Współtwórca',
    description: 'Praca operacyjna: zlecenia, magazyn, utrzymanie ruchu, andon',
    permissions: [
      'orders.read', 'orders.create', 'orders.update',
      'machines.read', 'machines.control',
      'operators.read',
      'inventory.read', 'inventory.write',
      'maintenance.read', 'maintenance.write',
      'andon.read', 'andon.report', 'andon.resolve',
      'sensors.read', 'analytics.read',
      'shifts.read',
      'settings.read', 'tenancy.read',
    ],
  },
  {
    code: 'viewer',
    name: 'Obserwator',
    description: 'Podgląd bez prawa modyfikacji, może zgłosić andon',
    permissions: [
      'orders.read',
      'machines.read',
      'operators.read',
      'inventory.read',
      'maintenance.read',
      'andon.read', 'andon.report',
      'sensors.read', 'analytics.read',
      'shifts.read',
      'settings.read', 'tenancy.read',
    ],
  },
  {
    code: 'guest',
    name: 'Gość',
    description: 'Dostęp wyłącznie do pulpitu i podglądu maszyn',
    permissions: ['machines.read'],
  },
];

const DEFAULT_TERMINOLOGY = {
  asset: 'Maszyna',
  assetPlural: 'Maszyny',
  workItem: 'Zlecenie',
  workItemPlural: 'Zlecenia',
  operator: 'Operator',
  operatorPlural: 'Operatorzy',
  site: 'Zakład',
  area: 'Linia',
};

export class CreateTenancyAndRbac1754000000013 implements MigrationInterface {
  name = 'CreateTenancyAndRbac1754000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- 1. Hierarchia organizacyjna -------------------------------------
    await queryRunner.createTable(
      new Table({
        name: 'tenants',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'slug', type: 'varchar', length: '60', isUnique: true },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'industry_pack', type: 'varchar', length: '60', isNullable: true },
          { name: 'terminology', type: 'jsonb', default: `'{}'::jsonb` },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'sites',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'tenant_id', type: 'int' },
          { name: 'code', type: 'varchar', length: '60' },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'timezone', type: 'varchar', length: '60', default: `'Europe/Warsaw'` },
          { name: 'is_active', type: 'boolean', default: true },
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
      'sites',
      new TableIndex({ name: 'idx_sites_tenant', columnNames: ['tenant_id'] }),
    );
    await queryRunner.createIndex(
      'sites',
      new TableIndex({
        name: 'idx_sites_tenant_code',
        columnNames: ['tenant_id', 'code'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'areas',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'tenant_id', type: 'int' },
          { name: 'site_id', type: 'int' },
          { name: 'parent_area_id', type: 'int', isNullable: true },
          { name: 'code', type: 'varchar', length: '60' },
          { name: 'name', type: 'varchar', length: '200' },
          { name: 'is_active', type: 'boolean', default: true },
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
          {
            columnNames: ['site_id'],
            referencedTableName: 'sites',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['parent_area_id'],
            referencedTableName: 'areas',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'areas',
      new TableIndex({ name: 'idx_areas_tenant', columnNames: ['tenant_id'] }),
    );
    await queryRunner.createIndex(
      'areas',
      new TableIndex({ name: 'idx_areas_site', columnNames: ['site_id'] }),
    );

    // --- 2. Role z bazy zamiast unii typów w kodzie ------------------------
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'tenant_id', type: 'int' },
          { name: 'code', type: 'varchar', length: '60' },
          { name: 'name', type: 'varchar', length: '150' },
          { name: 'description', type: 'varchar', length: '400', isNullable: true },
          { name: 'permissions', type: 'jsonb', default: `'[]'::jsonb` },
          { name: 'site_scope', type: 'jsonb', isNullable: true },
          { name: 'is_system', type: 'boolean', default: false },
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
    // Jawne ograniczenie UNIQUE, nie sam indeks — na tę parę kolumn wskazuje
    // później klucz obcy users(tenant_id, role).
    await queryRunner.query(
      `ALTER TABLE "roles" ADD CONSTRAINT "idx_roles_tenant_code" UNIQUE ("tenant_id", "code")`,
    );

    // --- 3. Domyślny tenant + zakład dla danych, które już są w bazie ------
    const inserted: { id: number }[] = await queryRunner.query(
      `INSERT INTO tenants (slug, name, industry_pack, terminology)
       VALUES ('default', 'Zakład domyślny', 'factory', $1::jsonb)
       RETURNING id`,
      [JSON.stringify(DEFAULT_TERMINOLOGY)],
    );
    const tenantId = inserted[0].id;

    await queryRunner.query(
      `INSERT INTO sites (tenant_id, code, name) VALUES ($1, 'main', 'Zakład główny')`,
      [tenantId],
    );

    for (const role of SYSTEM_ROLES) {
      await queryRunner.query(
        `INSERT INTO roles (tenant_id, code, name, description, permissions, is_system)
         VALUES ($1, $2, $3, $4, $5::jsonb, true)`,
        [tenantId, role.code, role.name, role.description, JSON.stringify(role.permissions)],
      );
    }

    // --- 4. tenant_id na tabelach domenowych ------------------------------
    // Kolumna wchodzi z DEFAULT, żeby backfill istniejących wierszy był
    // natychmiastowy, a zaraz potem staje się NOT NULL. DEFAULT zostaje:
    // seedy i skrypty CLI wstawiają dane bez jawnego tenanta.
    for (const table of TENANT_SCOPED_TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "tenant_id" int NOT NULL DEFAULT ${tenantId}`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "fk_${table}_tenant"
         FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE`,
      );
      await queryRunner.query(
        `CREATE INDEX "idx_${table}_tenant" ON "${table}" ("tenant_id")`,
      );
    }

    // --- 5. Unikalność przenoszona w obręb tenanta ------------------------
    for (const { table, column } of SCOPED_UNIQUE_COLUMNS) {
      await queryRunner.query(dropSingleColumnUniqueSql(table, column));
      await queryRunner.query(
        `CREATE UNIQUE INDEX "idx_${table}_tenant_${column.toLowerCase()}"
         ON "${table}" ("tenant_id", "${column}")`,
      );
    }

    // --- 6. Maszyna dostaje miejsce w hierarchii --------------------------
    await queryRunner.query(`ALTER TABLE "machines" ADD COLUMN "site_id" int NULL`);
    await queryRunner.query(`ALTER TABLE "machines" ADD COLUMN "area_id" int NULL`);
    await queryRunner.query(
      `ALTER TABLE "machines" ADD CONSTRAINT "fk_machines_site"
       FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" ADD CONSTRAINT "fk_machines_area"
       FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL`,
    );

    // Istniejące maszyny lądują w zakładzie głównym, żeby filtr po zakładzie
    // nie zgubił ich zaraz po migracji.
    await queryRunner.query(
      `UPDATE "machines" SET "site_id" = (SELECT id FROM sites WHERE tenant_id = $1 LIMIT 1)`,
      [tenantId],
    );

    // --- 7. users.role staje się kodem roli z tabeli roles ----------------
    // Kolumna już zawiera 'admin'/'contributor'/'viewer'/'guest', czyli dokładnie
    // kody ról zaseedowane wyżej — wystarczy ją poszerzyć i dopiąć klucz obcy.
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE varchar(60)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "fk_users_role"
       FOREIGN KEY ("tenant_id", "role") REFERENCES "roles"("tenant_id", "code")
       ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "fk_users_role"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE varchar(20)`);

    await queryRunner.query(`ALTER TABLE "machines" DROP CONSTRAINT "fk_machines_area"`);
    await queryRunner.query(`ALTER TABLE "machines" DROP CONSTRAINT "fk_machines_site"`);
    await queryRunner.query(`ALTER TABLE "machines" DROP COLUMN "area_id"`);
    await queryRunner.query(`ALTER TABLE "machines" DROP COLUMN "site_id"`);

    for (const { table, column } of SCOPED_UNIQUE_COLUMNS) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "idx_${table}_tenant_${column.toLowerCase()}"`,
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX "idx_${table}_${column.toLowerCase()}" ON "${table}" ("${column}")`,
      );
    }

    for (const table of TENANT_SCOPED_TABLES) {
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_${table}_tenant"`);
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT "fk_${table}_tenant"`,
      );
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "tenant_id"`);
    }

    await queryRunner.dropTable('roles');
    await queryRunner.dropTable('areas');
    await queryRunner.dropTable('sites');
    await queryRunner.dropTable('tenants');
  }
}
