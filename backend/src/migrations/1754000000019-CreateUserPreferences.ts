import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

// Osobista konfiguracja UI zapisana przy koncie. Pierwszym klientem tej tabeli
// są kolory legendy na wykresach analityki: użytkownik przemalowuje przyczyny
// przestoju pod siebie (np. daltonizm albo kolory przyjęte na hali) i chce je
// zastać po przelogowaniu, na innej maszynie, bez powtarzania wyboru.
//
// Świadomie NIE trafia to do localStorage: ustawienie ma iść za człowiekiem,
// a nie za przeglądarką, na której akurat siedzi.
export class CreateUserPreferences1754000000019 implements MigrationInterface {
  name = 'CreateUserPreferences1754000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_preferences',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'tenant_id', type: 'int' },
          { name: 'user_id', type: 'int' },
          { name: 'key', type: 'varchar', length: '60' },
          { name: 'value', type: 'jsonb', default: `'{}'::jsonb` },
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
          // Preferencja bez właściciela nie ma sensu — kasowanie konta zabiera
          // ją ze sobą, zamiast zostawiać sierotę wiążącą się z przyszłym
          // użytkownikiem o tym samym id.
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'user_preferences',
      new TableIndex({
        name: 'idx_user_preferences_user',
        columnNames: ['tenant_id', 'user_id'],
      }),
    );

    // Jeden wiersz na (klient, użytkownik, klucz) — dzięki temu zapis jest
    // aktualizacją istniejącego ustawienia, a nie doklejaniem kolejnej wersji.
    await queryRunner.createIndex(
      'user_preferences',
      new TableIndex({
        name: 'idx_user_preferences_unique',
        columnNames: ['tenant_id', 'user_id', 'key'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_preferences');
  }
}
