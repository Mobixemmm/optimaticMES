import { NestFactory } from '@nestjs/core';
import { Repository } from 'typeorm';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InventoryItem } from './entities/inventory-item.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const inventoryRepo = app.get<Repository<InventoryItem>>(
    getRepositoryToken(InventoryItem),
  );

  const items = [
    { code: 'AL-220', name: 'Blacha aluminiowa 2mm', stock: 420, unit: 'szt.', minStock: 200 },
    { code: 'ST-14', name: 'Stal C45 Ø14', stock: 88, unit: 'kg', minStock: 100 },
    { code: 'PR-20', name: 'Pręty Ø20 ciągnione', stock: 12, unit: 'szt.', minStock: 40 },
    { code: 'FL-32', name: 'Kołnierz FL-32', stock: 640, unit: 'szt.', minStock: 200 },
    { code: 'OL-05', name: 'Olej hydrauliczny HL46', stock: 34, unit: 'l', minStock: 20 },
    {
      code: 'SR-M8',
      name: 'Śruba M8 x 25 DIN 933',
      stock: 3200,
      unit: 'szt.',
      minStock: 1000,
    },
  ];

  for (const item of items) {
    const exists = await inventoryRepo.findOne({ where: { code: item.code } });
    if (!exists) {
      await inventoryRepo.save(item);
      console.log(`✅ Dodano pozycję magazynową: ${item.code} — ${item.name}`);
    } else {
      console.log(`ℹ️ Pozycja ${item.code} już istnieje`);
    }
  }

  console.log('🎉 Seedowanie magazynu zakończone!');
  await app.close();
}

void bootstrap();
