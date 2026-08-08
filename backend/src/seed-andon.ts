import { NestFactory } from '@nestjs/core';
import { Repository } from 'typeorm';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AndonAlert } from './entities/andon-alert.entity';

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const andonRepo = app.get<Repository<AndonAlert>>(getRepositoryToken(AndonAlert));

  const alerts = [
    {
      type: 'Awaria',
      machineId: 'Robot RB-07',
      message: 'Robot RB-07 — brak sygnału bezpieczeństwa',
      tone: 'err' as const,
      createdAt: minutesAgo(3),
    },
    {
      type: 'Materiał',
      machineId: 'CNC-02 DMG',
      message: 'CNC-02 — niski poziom prętów Ø20',
      tone: 'warn' as const,
      createdAt: minutesAgo(12),
    },
    {
      type: 'Jakość',
      machineId: 'Prasa PR-04',
      message: 'Prasa PR-04 — przekroczona tolerancja',
      tone: 'warn' as const,
      createdAt: minutesAgo(27),
    },
    {
      type: 'Info',
      machineId: 'Linia LN-12',
      message: 'Linia LN-12 — planowe przezbrojenie 16:00',
      tone: 'info' as const,
      createdAt: minutesAgo(60),
      isResolved: true,
      resolvedAt: minutesAgo(5),
    },
  ];

  const existingCount = await andonRepo.count();
  if (existingCount > 0) {
    console.log('ℹ️ Alerty Andon już istnieją w bazie — pomijam seed.');
  } else {
    for (const alert of alerts) {
      await andonRepo.save(alert);
      console.log(`✅ Dodano alert Andon: ${alert.type} — ${alert.message}`);
    }
  }

  console.log('🎉 Seedowanie alertów Andon zakończone!');
  await app.close();
}

void bootstrap();
