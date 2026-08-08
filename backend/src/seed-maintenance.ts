import { NestFactory } from '@nestjs/core';
import { Repository } from 'typeorm';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MaintenanceTask } from './entities/maintenance-task.entity';

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const maintenanceRepo = app.get<Repository<MaintenanceTask>>(
    getRepositoryToken(MaintenanceTask),
  );

  const tasks = [
    {
      taskNumber: 'MT-104',
      asset: 'Robot RB-07',
      type: 'Naprawa awaryjna',
      dueDate: daysFromNow(0),
      technician: 'R. Malinowski',
      priority: 'critical' as const,
    },
    {
      taskNumber: 'MT-103',
      asset: 'Prasa PR-04',
      type: 'Przezbrojenie',
      dueDate: daysFromNow(0),
      technician: 'M. Zieliński',
      priority: 'high' as const,
    },
    {
      taskNumber: 'MT-102',
      asset: 'CNC-01 Mazak',
      type: 'Przegląd PM-3',
      dueDate: daysFromNow(1),
      technician: 'T. Kamiński',
      priority: 'medium' as const,
    },
    {
      taskNumber: 'MT-101',
      asset: 'Linia LN-12',
      type: 'Smarowanie',
      dueDate: daysFromNow(3),
      technician: 'A. Dąbrowska',
      priority: 'low' as const,
    },
    {
      taskNumber: 'MT-100',
      asset: 'Piec PC-02',
      type: 'Kalibracja termopar',
      dueDate: daysFromNow(5),
      technician: 'J. Nowak',
      priority: 'medium' as const,
    },
  ];

  for (const task of tasks) {
    const exists = await maintenanceRepo.findOne({
      where: { taskNumber: task.taskNumber },
    });
    if (!exists) {
      await maintenanceRepo.save(task);
      console.log(`✅ Dodano zgłoszenie serwisowe: ${task.taskNumber} — ${task.asset}`);
    } else {
      console.log(`ℹ️ Zgłoszenie ${task.taskNumber} już istnieje`);
    }
  }

  console.log('🎉 Seedowanie zgłoszeń serwisowych zakończone!');
  await app.close();
}

void bootstrap();
