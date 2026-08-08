import { MigrationInterface, QueryRunner } from 'typeorm';

// Strefa, w której proces API zapisywał dotąd `start_time` i `end_time`.
// Kolumny były `timestamp WITHOUT time zone`, a sterownik pg serializuje obiekt
// Date do czasu LOKALNEGO procesu — czyli tego, co siedzi w TZ (patrz .env).
// `created_at` jest inne: wypełniał je DEFAULT CURRENT_TIMESTAMP po stronie
// bazy, a kontener timescaledb chodzi w UTC. Stąd w jednym wierszu dwie strefy
// (id 19: start 08:26:49 lokalnie, created 06:26:49 UTC — ta sama milisekunda).
// Konwersja MUSI więc iść dwiema różnymi ścieżkami, inaczej przesunie historię.
const APP_TIMEZONE = 'Europe/Warsaw';

export class RenameMachineStopColumns1754000000022
  implements MigrationInterface
{
  name = 'RenameMachineStopColumns1754000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "machine_stop_events" RENAME COLUMN "machine_id" TO "machine"`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_stop_events" RENAME COLUMN "start_time" TO "start_failure"`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_stop_events" RENAME COLUMN "end_time" TO "end_failure"`,
    );

    // AT TIME ZONE na wartości naiwnej znaczy "ta data jest w TEJ strefie" i
    // zwraca timestamptz — dokładnie to, czego potrzeba, żeby zachować moment
    // w czasie, a nie same cyfry.
    await queryRunner.query(
      `ALTER TABLE "machine_stop_events"
         ALTER COLUMN "start_failure" TYPE timestamptz
         USING "start_failure" AT TIME ZONE '${APP_TIMEZONE}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_stop_events"
         ALTER COLUMN "end_failure" TYPE timestamptz
         USING "end_failure" AT TIME ZONE '${APP_TIMEZONE}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_stop_events"
         ALTER COLUMN "created_at" TYPE timestamptz
         USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_stop_events"
         ALTER COLUMN "created_at" SET DEFAULT now()`,
    );

    // Dotąd "jeden otwarty przestój na maszynę" pilnował wyłącznie kod serwisu
    // (endActive() przed start()). Dwa równoległe żądania z panelu robiły więc
    // dwa otwarte wiersze i maszyna zostawała w przestoju na zawsze — indeks
    // częściowy przenosi tę regułę tam, gdzie nikt jej nie ominie.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_machine_stop_events_open"
         ON "machine_stop_events" ("tenant_id", "machine")
         WHERE "end_failure" IS NULL`,
    );

    // findCurrent() i analityka filtrują zawsze po tenancie i maszynie,
    // sortując po czasie startu.
    await queryRunner.query(
      `CREATE INDEX "idx_machine_stop_events_lookup"
         ON "machine_stop_events" ("tenant_id", "machine", "start_failure" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_machine_stop_events_lookup"`);
    await queryRunner.query(`DROP INDEX "uq_machine_stop_events_open"`);

    await queryRunner.query(
      `ALTER TABLE "machine_stop_events"
         ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_stop_events"
         ALTER COLUMN "created_at" TYPE timestamp
         USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_stop_events"
         ALTER COLUMN "end_failure" TYPE timestamp
         USING "end_failure" AT TIME ZONE '${APP_TIMEZONE}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_stop_events"
         ALTER COLUMN "start_failure" TYPE timestamp
         USING "start_failure" AT TIME ZONE '${APP_TIMEZONE}'`,
    );

    await queryRunner.query(
      `ALTER TABLE "machine_stop_events" RENAME COLUMN "end_failure" TO "end_time"`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_stop_events" RENAME COLUMN "start_failure" TO "start_time"`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_stop_events" RENAME COLUMN "machine" TO "machine_id"`,
    );
  }
}
