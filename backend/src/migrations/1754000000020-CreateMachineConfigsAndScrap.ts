import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

// Trzy tabele pod dwie pozycje cennika naraz — panel operatorski i moduł SCRAP —
// bo są nierozdzielne: panel jest miejscem, z którego operator zgłasza odrzut,
// a machine_configs decyduje, czy na danej maszynie ten przycisk w ogóle stoi
// i czy zamiast niego liczy czujnik.
//
// Katalog kategorii dostaje zestaw startowy. Bez niego pierwsze uruchomienie
// panelu daje przycisk "Zgłoś odrzut" bez ani jednej przyczyny do wyboru,
// czyli funkcję, której nie da się użyć.
const DEFAULT_SCRAP_CATEGORIES: {
  code: string;
  label: string;
  group: string | null;
  sortOrder: number;
}[] = [
  { code: 'MATERIAL', label: 'Wada materiału', group: 'Materiał', sortOrder: 10 },
  { code: 'SETUP', label: 'Rozruch / przezbrojenie', group: 'Metoda', sortOrder: 20 },
  { code: 'MACHINE', label: 'Usterka maszyny', group: 'Maszyna', sortOrder: 30 },
  { code: 'TOOL', label: 'Zużyte narzędzie', group: 'Maszyna', sortOrder: 40 },
  { code: 'OPERATOR', label: 'Błąd obsługi', group: 'Człowiek', sortOrder: 50 },
  { code: 'DIMENSION', label: 'Niezgodność wymiarowa', group: 'Metoda', sortOrder: 60 },
  { code: 'SURFACE', label: 'Wada powierzchni', group: 'Metoda', sortOrder: 70 },
  // Kosz na odrzut z czujnika, który nie niesie przyczyny. Wpis czeka, aż ktoś
  // przypisze mu właściwą kategorię — jest widoczny, a nie po cichu zgubiony.
  {
    code: 'UNCLASSIFIED',
    label: 'Bez przypisanej przyczyny',
    group: null,
    sortOrder: 900,
  },
];

export class CreateMachineConfigsAndScrap1754000000020
  implements MigrationInterface
{
  name = 'CreateMachineConfigsAndScrap1754000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'machine_configs',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'tenant_id', type: 'int' },
          { name: 'machine_id', type: 'varchar', length: '100' },
          { name: 'panel_modules', type: 'jsonb', isNullable: true },
          { name: 'config', type: 'jsonb', default: `'{}'::jsonb` },
          {
            name: 'scrap_cursor_value',
            type: 'numeric',
            precision: 14,
            scale: 3,
            isNullable: true,
          },
          { name: 'scrap_cursor_at', type: 'timestamp', isNullable: true },
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
      'machine_configs',
      new TableIndex({
        name: 'idx_machine_configs_unique',
        columnNames: ['tenant_id', 'machine_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'scrap_categories',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'tenant_id', type: 'int' },
          { name: 'code', type: 'varchar', length: '40' },
          { name: 'label', type: 'varchar', length: '120' },
          { name: 'group', type: 'varchar', length: '60', isNullable: true },
          { name: 'sort_order', type: 'int', default: 100 },
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
      'scrap_categories',
      new TableIndex({
        name: 'idx_scrap_categories_unique',
        columnNames: ['tenant_id', 'code'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'scrap_events',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'tenant_id', type: 'int' },
          { name: 'machine_id', type: 'varchar', length: '100' },
          { name: 'order_id', type: 'int', isNullable: true },
          { name: 'category_code', type: 'varchar', length: '40', isNullable: true },
          { name: 'quantity', type: 'numeric', precision: 14, scale: 3 },
          { name: 'source', type: 'varchar', length: '20' },
          { name: 'operator_id', type: 'int', isNullable: true },
          { name: 'notes', type: 'varchar', length: '255', isNullable: true },
          { name: 'recorded_at', type: 'timestamp' },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          // Skasowanie zlecenia nie może skasować historii odrzutu — zdarzenie
          // zostaje, traci tylko powiązanie.
          {
            columnNames: ['order_id'],
            referencedTableName: 'production_orders',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'scrap_events',
      new TableIndex({
        name: 'idx_scrap_events_machine_time',
        columnNames: ['tenant_id', 'machine_id', 'recorded_at'],
      }),
    );
    await queryRunner.createIndex(
      'scrap_events',
      new TableIndex({
        name: 'idx_scrap_events_order',
        columnNames: ['tenant_id', 'order_id'],
      }),
    );

    const tenants: { id: number }[] = await queryRunner.query(
      `SELECT id FROM tenants`,
    );
    for (const tenant of tenants) {
      for (const category of DEFAULT_SCRAP_CATEGORIES) {
        await queryRunner.query(
          `INSERT INTO scrap_categories (tenant_id, code, label, "group", sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            tenant.id,
            category.code,
            category.label,
            category.group,
            category.sortOrder,
          ],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('scrap_events');
    await queryRunner.dropTable('scrap_categories');
    await queryRunner.dropTable('machine_configs');
  }
}
