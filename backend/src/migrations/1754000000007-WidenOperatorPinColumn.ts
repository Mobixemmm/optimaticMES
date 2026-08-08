import { MigrationInterface, QueryRunner } from 'typeorm';

// PIN operatora jest teraz przechowywany jako hash bcrypt (drugi składnik
// logowania obok karty RFID), więc kolumna musi pomieścić ~60-znakowy hash.
// Istniejące plaintextowe wartości PIN przestają być poprawne — administrator
// musi ustawić PIN ponownie dla każdego operatora (endpoint PATCH /operators/:id).
export class WidenOperatorPinColumn1754000000007
  implements MigrationInterface
{
  name = 'WidenOperatorPinColumn1754000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "operators" ALTER COLUMN "pinCode" TYPE varchar(100)`,
    );
    // Wyczyść stare plaintextowe PIN-y — nie są kompatybilne z bcrypt.compare().
    await queryRunner.query(`UPDATE "operators" SET "pinCode" = NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "operators" ALTER COLUMN "pinCode" TYPE varchar(20)`,
    );
  }
}
