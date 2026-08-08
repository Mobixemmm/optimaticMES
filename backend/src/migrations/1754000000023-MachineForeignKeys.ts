import { MigrationInterface, QueryRunner } from 'typeorm';

// Do tej pory każda tabela trzymała maszynę jako luźny varchar bez żadnego
// powiązania z `machines`. Skutek widać było w danych: 18 przestojów i 4 alerty
// Andon wskazywały na maszyny, których w rejestrze nigdy nie było
// ("Robot RB-07", "CNC-01 Mazak" itd.), bo seedy demo zapisywały zdarzenia dla
// maszyn, których wcześniej nie zarejestrowały. Analityka liczy stan maszyn po
// liście z `machines`, więc te przestoje po prostu nie istniały dla OEE.
//
// Celem FK jest para (tenant_id, machine_id), a nie samo machine_id — inaczej
// jeden klient mógłby wskazać maszynę drugiego. `machines` ma na to gotowy
// unikat idx_machines_tenant_machine_id.
//
// machine_data NIE dostaje klucza obcego świadomie: to hypertable TimescaleDB
// zapisywany przez gateway po samym stringu, poza tenantem (patrz komentarz w
// migracji CreateTenancyAndRbac). Wiązanie go FK zablokowałoby zapis telemetrii
// z maszyny, której nikt jeszcze nie zarejestrował.
interface MachineRef {
  table: string;
  column: string;
  // ON DELETE dobrane per tabela: historii produkcyjnej nie kasujemy po cichu
  // razem z maszyną, ale konfiguracja panelu bez maszyny nie ma sensu.
  onDelete: 'RESTRICT' | 'CASCADE' | 'SET NULL';
}

const MACHINE_REFS: MachineRef[] = [
  { table: 'machine_stop_events', column: 'machine', onDelete: 'RESTRICT' },
  { table: 'scrap_events', column: 'machine_id', onDelete: 'RESTRICT' },
  { table: 'machine_configs', column: 'machine_id', onDelete: 'CASCADE' },
  { table: 'andon_alerts', column: 'machine_id', onDelete: 'SET NULL' },
  { table: 'production_orders', column: 'machine_id', onDelete: 'SET NULL' },
  { table: 'quality_defects', column: 'machine_id', onDelete: 'SET NULL' },
];

// Tabele, z których dociągamy brakujące maszyny przed założeniem FK. Reszta
// tabel nie miała sierot, więc nie ma czego naprawiać.
const REPAIR_SOURCES: { table: string; column: string }[] = [
  { table: 'machine_stop_events', column: 'machine' },
  { table: 'andon_alerts', column: 'machine_id' },
];

function fkName(table: string): string {
  return `fk_${table}_machine`;
}

function refIndexName(table: string): string {
  return `idx_${table}_tenant_machine`;
}

export class MachineForeignKeys1754000000023 implements MigrationInterface {
  name = 'MachineForeignKeys1754000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Naprawa danych. Lista maszyn bierze się z tego, co REALNIE jest w
    //    tabelach, a nie z zaszytych nazw — dzięki temu migracja poradzi sobie
    //    z dowolnym stanem bazy klienta, nie tylko z naszym seedem demo.
    //    Materializujemy dokładnie te maszyny, których istnienie dane już
    //    zakładają; alternatywa (skasowanie wierszy) niszczyłaby historię.
    for (const { table, column } of REPAIR_SOURCES) {
      await queryRunner.query(
        `INSERT INTO "machines" ("machine_id", "name", "tenant_id", "is_active")
         SELECT DISTINCT src."${column}", src."${column}", src."tenant_id", true
         FROM "${table}" src
         WHERE src."${column}" IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM "machines" m
             WHERE m."machine_id" = src."${column}"
               AND m."tenant_id" = src."tenant_id"
           )
         ON CONFLICT ("tenant_id", "machine_id") DO NOTHING`,
      );
    }

    // 2. Indeksy po stronie dziecka. Bez nich każde skasowanie maszyny robi
    //    pełny skan każdej tabeli potomnej, żeby sprawdzić ograniczenie.
    for (const { table, column } of MACHINE_REFS) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "${refIndexName(table)}"
           ON "${table}" ("tenant_id", "${column}")`,
      );
    }

    // 3. Klucze obce. ON UPDATE CASCADE jest tu istotne: machineId da się
    //    zmienić przez PATCH /machines/:id, a bez kaskady zmiana nazwy maszyny
    //    zrywałaby powiązanie z całą jej historią.
    for (const { table, column, onDelete } of MACHINE_REFS) {
      await queryRunner.query(
        `ALTER TABLE "${table}"
           ADD CONSTRAINT "${fkName(table)}"
           FOREIGN KEY ("tenant_id", "${column}")
           REFERENCES "machines" ("tenant_id", "machine_id")
           ON UPDATE CASCADE
           ON DELETE ${onDelete}`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { table } of [...MACHINE_REFS].reverse()) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${fkName(table)}"`,
      );
      await queryRunner.query(`DROP INDEX IF EXISTS "${refIndexName(table)}"`);
    }
    // Maszyn dociągniętych w kroku 1 NIE usuwamy: po założeniu FK nie da się
    // odróżnić ich od maszyn dodanych później ręcznie albo przez telemetrię,
    // a skasowanie cudzej maszyny jest gorsze niż zostawienie nadmiarowej.
  }
}
