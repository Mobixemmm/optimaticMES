import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

// Zamiana płaskiej listy feature flag na konfigurację modułów. Stare flagi nie
// są kasowane bez śladu — każda ma tu swoje miejsce docelowe, a wartości
// ustawione przez klienta zostają przeniesione 1:1.
//
// `enabled` steruje widocznością modułu w menu; flagi opisujące zachowanie
// WEWNĄTRZ modułu (np. czy wolno kasować zlecenia) schodzą do jego `config`.
const FLAG_TO_MODULE: Record<
  string,
  { module: string; target: 'enabled' } | { module: string; target: 'config'; key: string }
> = {
  SHOW_MACHINES_TAB: { module: 'machines', target: 'enabled' },
  ENABLE_TEMPERATURE_STREAM: { module: 'machines', target: 'config', key: 'temperatureStream' },
  ENABLE_OPERATOR_PANEL: { module: 'machines', target: 'config', key: 'operatorPanel' },
  ENABLE_ADD_MACHINE_BTN: { module: 'machines', target: 'config', key: 'allowAddMachine' },

  SHOW_ORDERS_TAB: { module: 'orders', target: 'enabled' },
  ALLOW_ORDER_CREATE: { module: 'orders', target: 'config', key: 'allowCreate' },
  ALLOW_ORDER_STATUS_CHANGE: { module: 'orders', target: 'config', key: 'allowStatusChange' },
  ALLOW_ORDER_DELETE: { module: 'orders', target: 'config', key: 'allowDelete' },

  SHOW_KPI_CARDS: { module: 'dashboard', target: 'config', key: 'showKpiCards' },
  SHOW_OEE_CHART: { module: 'dashboard', target: 'config', key: 'showOeeChart' },
  SHOW_SHIFT_TILE: { module: 'dashboard', target: 'config', key: 'showShiftTile' },

  SHOW_MAINTENANCE_TAB: { module: 'maintenance', target: 'enabled' },
  SHOW_OPERATORS_TAB: { module: 'operators', target: 'enabled' },
  SHOW_ANALYTICS_TAB: { module: 'analytics', target: 'enabled' },
  SHOW_INVENTORY_TAB: { module: 'inventory', target: 'enabled' },
};

// Snapshot rejestru modułów z chwili powstania migracji (patrz
// settings/modules.constants.ts — tam jest wersja żywa, używana w runtime).
const MODULE_SEED: {
  key: string;
  label: string;
  icon: string;
  sortOrder: number;
  requiredPermission: string | null;
  config: Record<string, unknown>;
}[] = [
  {
    key: 'dashboard',
    label: 'Pulpit',
    icon: 'LayoutDashboard',
    sortOrder: 10,
    requiredPermission: null,
    config: { showKpiCards: true, showOeeChart: true, showShiftTile: true },
  },
  {
    key: 'machines',
    label: 'Maszyny',
    icon: 'Factory',
    sortOrder: 20,
    requiredPermission: 'machines.read',
    config: { temperatureStream: true, operatorPanel: true, allowAddMachine: true },
  },
  {
    key: 'orders',
    label: 'Zlecenia',
    icon: 'ClipboardList',
    sortOrder: 30,
    requiredPermission: 'orders.read',
    config: { allowCreate: true, allowStatusChange: true, allowDelete: true },
  },
  {
    key: 'maintenance',
    label: 'Utrzymanie ruchu',
    icon: 'Wrench',
    sortOrder: 40,
    requiredPermission: 'maintenance.read',
    config: {},
  },
  {
    key: 'analytics',
    label: 'Analityka',
    icon: 'BarChart3',
    sortOrder: 50,
    requiredPermission: 'analytics.read',
    config: {},
  },
  {
    key: 'inventory',
    label: 'Magazyn',
    icon: 'Package',
    sortOrder: 60,
    requiredPermission: 'inventory.read',
    config: {},
  },
  {
    key: 'operators',
    label: 'Operatorzy',
    icon: 'Users',
    sortOrder: 70,
    requiredPermission: 'operators.read',
    config: {},
  },
  {
    key: 'settings',
    label: 'Ustawienia',
    icon: 'Settings',
    sortOrder: 900,
    requiredPermission: null,
    config: {},
  },
];

export class CreateModuleConfigs1754000000014 implements MigrationInterface {
  name = 'CreateModuleConfigs1754000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'module_configs',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'tenant_id', type: 'int' },
          { name: 'site_id', type: 'int', isNullable: true },
          { name: 'module_key', type: 'varchar', length: '60' },
          { name: 'enabled', type: 'boolean', default: true },
          { name: 'label', type: 'varchar', length: '120', isNullable: true },
          { name: 'icon', type: 'varchar', length: '60', isNullable: true },
          { name: 'sort_order', type: 'int', default: 100 },
          { name: 'required_permission', type: 'varchar', length: '60', isNullable: true },
          { name: 'config', type: 'jsonb', default: `'{}'::jsonb` },
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
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'module_configs',
      new TableIndex({ name: 'idx_module_configs_tenant', columnNames: ['tenant_id'] }),
    );
    // NULL-e w site_id nie kolidują ze sobą w zwykłym UNIQUE, więc rozbijamy to
    // na dwa indeksy częściowe: jeden dla ustawień globalnych tenanta, drugi dla
    // nadpisań per zakład.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_module_configs_tenant_module"
       ON "module_configs" ("tenant_id", "module_key") WHERE "site_id" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_module_configs_tenant_site_module"
       ON "module_configs" ("tenant_id", "site_id", "module_key") WHERE "site_id" IS NOT NULL`,
    );

    // --- Przeniesienie wartości ze starych flag --------------------------
    const flagRows: { key: string; enabled: boolean }[] = await queryRunner.query(
      `SELECT "key", enabled FROM feature_flags`,
    );
    const flags = new Map(flagRows.map((r) => [r.key, r.enabled]));

    const tenants: { id: number }[] = await queryRunner.query(`SELECT id FROM tenants`);

    for (const tenant of tenants) {
      const seeds = MODULE_SEED.map((m) => ({ ...m, enabled: true, config: { ...m.config } }));
      const byKey = new Map(seeds.map((s) => [s.key, s]));

      for (const [flagKey, mapping] of Object.entries(FLAG_TO_MODULE)) {
        const value = flags.get(flagKey);
        if (value === undefined) continue;
        const seed = byKey.get(mapping.module);
        if (!seed) continue;
        if (mapping.target === 'enabled') {
          seed.enabled = value;
        } else {
          seed.config[mapping.key] = value;
        }
      }

      for (const seed of seeds) {
        await queryRunner.query(
          `INSERT INTO module_configs
             (tenant_id, site_id, module_key, enabled, label, icon, sort_order, required_permission, config)
           VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
          [
            tenant.id,
            seed.key,
            seed.enabled,
            seed.label,
            seed.icon,
            seed.sortOrder,
            seed.requiredPermission,
            JSON.stringify(seed.config),
          ],
        );
      }
    }

    // Dane są przeniesione — zostawienie pustej tabeli feature_flags tylko
    // myliłoby: wyglądałaby na źródło prawdy, którym już nie jest.
    await queryRunner.dropTable('feature_flags');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'feature_flags',
        columns: [
          { name: 'key', type: 'varchar', length: '100', isPrimary: true },
          { name: 'enabled', type: 'boolean', default: true },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // Odtworzenie flag z konfiguracji modułów pierwszego tenanta — przy wielu
    // klientach płaska lista flag i tak nie ma jak ich wszystkich pomieścić.
    const modules: {
      module_key: string;
      enabled: boolean;
      config: Record<string, unknown>;
    }[] = await queryRunner.query(
      `SELECT module_key, enabled, config FROM module_configs
       WHERE site_id IS NULL AND tenant_id = (SELECT MIN(id) FROM tenants)`,
    );
    const byKey = new Map(modules.map((m) => [m.module_key, m]));

    for (const [flagKey, mapping] of Object.entries(FLAG_TO_MODULE)) {
      const mod = byKey.get(mapping.module);
      const value =
        mapping.target === 'enabled'
          ? (mod?.enabled ?? true)
          : (mod?.config?.[mapping.key] ?? true);
      await queryRunner.query(
        `INSERT INTO feature_flags ("key", enabled) VALUES ($1, $2)`,
        [flagKey, value === true],
      );
    }

    await queryRunner.dropTable('module_configs');
  }
}
