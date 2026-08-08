import { MigrationInterface, QueryRunner, Table } from 'typeorm';

// Bazowy schemat — wcześniej te tabele istniały tylko dzięki ręcznie
// odpalonemu database/001_create_tables.sql (rozjechanemu z encjami) i/lub
// TypeORM `synchronize` w trakcie wczesnego developmentu. Ta migracja jest
// jedynym źródłem prawdy: świeże środowisko stawiamy przez `npm run migration:run`,
// bez żadnych ręcznych kroków. machine_data staje się hypertable TimescaleDB —
// to tu OPC UA/inny gateway ma pisać odczyty z maszyn.
//
// Celowo NIE zawiera kolumn dodanych późniejszymi migracjami (żeby ich ADD
// COLUMN nie wysypało się na "column already exists"): operators.role/station/
// shift/efficiencyPct dodaje AddOperatorProfileFields (1754000000001),
// production_orders.producedQuantity/scrapQuantity dodaje AddOrderProgressFields
// (1754000000002).
export class CreateCoreTables1753800000000 implements MigrationInterface {
  name = 'CreateCoreTables1753800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS timescaledb`);

    await queryRunner.createTable(
      new Table({
        name: 'production_orders',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'orderNumber', type: 'varchar', length: '50', isUnique: true },
          { name: 'productName', type: 'varchar', length: '200' },
          { name: 'quantity', type: 'int' },
          { name: 'status', type: 'varchar', length: '20', default: `'pending'` },
          { name: 'plannedStart', type: 'timestamp', isNullable: true },
          { name: 'actualStart', type: 'timestamp', isNullable: true },
          { name: 'actualEnd', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'operators',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'firstName', type: 'varchar', length: '100' },
          { name: 'lastName', type: 'varchar', length: '100' },
          { name: 'rfidCardId', type: 'varchar', length: '50', isUnique: true },
          { name: 'pinCode', type: 'varchar', length: '20', isNullable: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // Uwaga: OperatorSession ma zarówno zwykłą kolumnę operatorId (używaną w
    // zapytaniach serwisu), jak i osobną relację @ManyToOne z @JoinColumn
    // ('operator_id'), która generuje DRUGĄ, FK-ową kolumnę operator_id.
    // To duplikacja z wczesnego etapu projektu — świadomie odtwarzana tu 1:1,
    // żeby świeża baza zachowywała się identycznie jak istniejące środowiska;
    // uporządkowanie encji to osobna zmiana wykraczająca poza ten task.
    await queryRunner.createTable(
      new Table({
        name: 'operator_sessions',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'operatorId', type: 'int' },
          { name: 'rfidCardId', type: 'varchar', length: '100' },
          { name: 'loginTime', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'logoutTime', type: 'timestamp', isNullable: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'operator_id', type: 'int', isNullable: true },
        ],
        foreignKeys: [
          {
            columnNames: ['operator_id'],
            referencedTableName: 'operators',
            referencedColumnNames: ['id'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'sensor_data',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'sensorName', type: 'varchar', length: '100' },
          { name: 'value', type: 'decimal', precision: 5, scale: 2 },
          { name: 'unit', type: 'varchar', length: '20' },
          { name: 'location', type: 'varchar', length: '100' },
          { name: 'timestamp', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // machine_data: klucz główny złożony (time, machine_id, tag_name) — jedna
    // wartość na tag na maszynę na moment. Gateway (OPC UA/MQTT/Modbus) pisze
    // tu bezpośrednio, bez FK do machines — patrz Machine.syncFromTelemetry().
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS machine_data (
        "time" timestamptz NOT NULL,
        machine_id text NOT NULL,
        tag_name text NOT NULL,
        value_num double precision,
        value_bool boolean,
        value_text text,
        PRIMARY KEY ("time", machine_id, tag_name)
      )
    `);

    // sensor_data NIE jest hypertable: jego PK to samo "id" (bez kolumny czasu),
    // a TimescaleDB wymaga, żeby kolumna partycjonująca wchodziła w skład
    // każdego unique/PK indeksu. Zmiana na hypertable wymagałaby złożonego
    // klucza (id, timestamp) — do rozważenia osobno, gdy dane realnie urosną.
    //
    // Jawne sprawdzenie przez katalog zamiast polegać na create_hypertable's
    // if_not_exists => true: w praktyce potrafi ono i tak rzucić błędem
    // ("already partitioned"), gdy tabela ma już strukturę partycji, ale nie
    // jest czysto zarejestrowana w katalogu TimescaleDB (np. po ręcznym imporcie).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM timescaledb_information.hypertables
          WHERE hypertable_name = 'machine_data'
        ) THEN
          PERFORM create_hypertable('machine_data', 'time', migrate_data => true);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('machine_data');
    await queryRunner.dropTable('sensor_data');
    await queryRunner.dropTable('operator_sessions');
    await queryRunner.dropTable('operators');
    await queryRunner.dropTable('production_orders');
  }
}
