import { NestFactory } from '@nestjs/core';
import { Repository } from 'typeorm';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MachineStopEvent, StopReason } from './entities/machine-stop-event.entity';

function daysAgoAt(daysAgo: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function plusMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60 * 1000);
}

interface SeedStop {
  machine: string;
  reason: StopReason;
  startFailure: Date;
  endFailure: Date | null;
  notes?: string;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const stopRepo = app.get<Repository<MachineStopEvent>>(
    getRepositoryToken(MachineStopEvent),
  );

  const existingCount = await stopRepo.count();
  if (existingCount > 0) {
    console.log('ℹ️ Zdarzenia przestojów już istnieją w bazie — pomijam seed.');
    await app.close();
    return;
  }

  const stops: SeedStop[] = [
    // CNC-01 Mazak
    { machine: 'CNC-01 Mazak', reason: 'setup', startFailure: daysAgoAt(1, 6), endFailure: plusMinutes(daysAgoAt(1, 6), 35) },
    { machine: 'CNC-01 Mazak', reason: 'micro_stop', startFailure: daysAgoAt(3, 10), endFailure: plusMinutes(daysAgoAt(3, 10), 8) },
    { machine: 'CNC-01 Mazak', reason: 'failure', startFailure: daysAgoAt(9, 14), endFailure: plusMinutes(daysAgoAt(9, 14), 52) },
    { machine: 'CNC-01 Mazak', reason: 'setup', startFailure: daysAgoAt(16, 7), endFailure: plusMinutes(daysAgoAt(16, 7), 40) },

    // CNC-02 DMG
    { machine: 'CNC-02 DMG', reason: 'material', startFailure: daysAgoAt(2, 9), endFailure: plusMinutes(daysAgoAt(2, 9), 65) },
    { machine: 'CNC-02 DMG', reason: 'micro_stop', startFailure: daysAgoAt(5, 13), endFailure: plusMinutes(daysAgoAt(5, 13), 6) },
    { machine: 'CNC-02 DMG', reason: 'failure', startFailure: daysAgoAt(12, 11), endFailure: plusMinutes(daysAgoAt(12, 11), 38) },

    // Prasa PR-04
    { machine: 'Prasa PR-04', reason: 'quality', startFailure: daysAgoAt(0, 8), endFailure: plusMinutes(daysAgoAt(0, 8), 25) },
    { machine: 'Prasa PR-04', reason: 'setup', startFailure: daysAgoAt(4, 15), endFailure: plusMinutes(daysAgoAt(4, 15), 48) },
    { machine: 'Prasa PR-04', reason: 'failure', startFailure: daysAgoAt(7, 9), endFailure: plusMinutes(daysAgoAt(7, 9), 70) },
    { machine: 'Prasa PR-04', reason: 'failure', startFailure: daysAgoAt(18, 10), endFailure: plusMinutes(daysAgoAt(18, 10), 45) },

    // Robot RB-07 — awaria wciąż trwa (spójne z zasianym alertem Andon)
    { machine: 'Robot RB-07', reason: 'failure', startFailure: daysAgoAt(6, 16), endFailure: plusMinutes(daysAgoAt(6, 16), 90) },
    { machine: 'Robot RB-07', reason: 'micro_stop', startFailure: daysAgoAt(11, 9), endFailure: plusMinutes(daysAgoAt(11, 9), 5) },
    {
      machine: 'Robot RB-07',
      reason: 'failure',
      startFailure: new Date(Date.now() - 3 * 60 * 1000),
      endFailure: null,
      notes: 'Brak sygnału bezpieczeństwa',
    },

    // Linia LN-12
    { machine: 'Linia LN-12', reason: 'planned', startFailure: daysAgoAt(0, 16), endFailure: plusMinutes(daysAgoAt(0, 16), 30) },
    { machine: 'Linia LN-12', reason: 'micro_stop', startFailure: daysAgoAt(3, 12), endFailure: plusMinutes(daysAgoAt(3, 12), 10) },
    { machine: 'Linia LN-12', reason: 'material', startFailure: daysAgoAt(8, 14), endFailure: plusMinutes(daysAgoAt(8, 14), 55) },
    { machine: 'Linia LN-12', reason: 'setup', startFailure: daysAgoAt(14, 8), endFailure: plusMinutes(daysAgoAt(14, 8), 42) },
  ];

  for (const stop of stops) {
    await stopRepo.save(stop);
  }
  console.log(`✅ Dodano ${stops.length} historycznych zdarzeń przestojów maszyn`);

  console.log('🎉 Seedowanie przestojów maszyn zakończone!');
  await app.close();
}

void bootstrap();
