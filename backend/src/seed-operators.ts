import { NestFactory } from '@nestjs/core';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Operator } from './entities/operator.entity';

const PIN_SALT_ROUNDS = 10;

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const operatorRepo = app.get<Repository<Operator>>(
    getRepositoryToken(Operator),
  );

  const operators = [
    {
      firstName: 'Jan',
      lastName: 'Kowalski',
      rfidCardId: 'A3F29B1C4D5E',
      pinCode: '1234',
      role: 'Operator CNC',
      station: 'CNC-03',
      shift: 'I',
      efficiencyPct: 85,
    },
    {
      firstName: 'Anna',
      lastName: 'Nowak',
      rfidCardId: 'B7E18C2F6A0D',
      pinCode: '5678',
      role: 'Operator linii',
      station: 'Linia LN-08',
      shift: 'I',
      efficiencyPct: 90,
    },
    {
      firstName: 'Piotr',
      lastName: 'Wiśniewski',
      rfidCardId: 'C5D40A9E3B7F',
      pinCode: '9012',
      role: 'Operator CNC',
      station: 'CNC-02',
      shift: 'II',
      efficiencyPct: 88,
    },
    {
      firstName: 'Anna',
      lastName: 'Kowalska',
      rfidCardId: 'D1A2B3C4D5E6',
      pinCode: '3456',
      role: 'Kierownik produkcji',
      station: 'Biuro',
      shift: 'II',
      efficiencyPct: 98,
    },
    {
      firstName: 'Jakub',
      lastName: 'Nowak',
      rfidCardId: 'E2B3C4D5E6F7',
      pinCode: '7890',
      role: 'Operator CNC',
      station: 'CNC-01',
      shift: 'II',
      efficiencyPct: 94,
    },
    {
      firstName: 'Michał',
      lastName: 'Zieliński',
      rfidCardId: 'F3C4D5E6F7A8',
      pinCode: '2345',
      role: 'Ustawiacz',
      station: 'Prasa PR-04',
      shift: 'II',
      efficiencyPct: 82,
    },
    {
      firstName: 'Katarzyna',
      lastName: 'Lewandowska',
      rfidCardId: 'A4D5E6F7A8B9',
      pinCode: '6789',
      role: 'Operator linii',
      station: 'Linia LN-12',
      shift: 'II',
      efficiencyPct: 91,
    },
    {
      firstName: 'Tomasz',
      lastName: 'Kamiński',
      rfidCardId: 'B5E6F7A8B9C0',
      pinCode: '0123',
      role: 'Operator pieca',
      station: 'Piec PC-02',
      shift: 'II',
      efficiencyPct: 87,
    },
    {
      firstName: 'Aleksandra',
      lastName: 'Dąbrowska',
      rfidCardId: 'C6F7A8B9C0D1',
      pinCode: '4567',
      role: 'Pakowanie',
      station: 'PK-01',
      shift: 'II',
      efficiencyPct: 79,
    },
    {
      firstName: 'Rafał',
      lastName: 'Malinowski',
      rfidCardId: 'D7A8B9C0D1E2',
      pinCode: '8901',
      role: 'Technik UR',
      station: 'Serwis',
      shift: 'II',
      efficiencyPct: 92,
    },
  ];

  for (const op of operators) {
    const { pinCode, ...rest } = op;
    const exists = await operatorRepo.findOne({
      where: { rfidCardId: op.rfidCardId },
    });
    if (!exists) {
      const pinHash = await bcrypt.hash(pinCode, PIN_SALT_ROUNDS);
      await operatorRepo.save({ ...rest, pinHash });
      console.log(
        `✅ Dodano operatora: ${op.firstName} ${op.lastName} (RFID: ${op.rfidCardId}, PIN: ${pinCode})`,
      );
    } else {
      console.log(`ℹ️ Operator ${op.firstName} ${op.lastName} już istnieje`);
    }
  }

  console.log('🎉 Seedowanie zakończone! (PIN-y wypisane powyżej — przekaż je operatorom i wyczyść terminal)');
  await app.close();
}

void bootstrap();
