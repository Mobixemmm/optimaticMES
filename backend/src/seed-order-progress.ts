import { NestFactory } from '@nestjs/core';
import { Repository } from 'typeorm';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductionOrder } from './entities/production-order.entity';

// Uzupełnia produkcję/braki dla istniejących zleceń, które nie mają jeszcze
// ustawionego postępu (nowe kolumny producedQuantity/scrapQuantity domyślnie = 0),
// żeby wskaźniki OEE w Analityce miały realne dane od razu po seedowaniu.
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const orderRepo = app.get<Repository<ProductionOrder>>(
    getRepositoryToken(ProductionOrder),
  );

  const orders = await orderRepo.find();
  let updated = 0;

  for (const order of orders) {
    if (order.producedQuantity > 0) continue;

    let producedRatio = 0;
    if (order.status === 'completed') {
      producedRatio = 1;
    } else if (order.status === 'in_progress') {
      producedRatio = 0.4 + Math.random() * 0.4; // 40–80%
    } else {
      continue; // pending/cancelled — zostaje 0
    }

    const produced = Math.round(order.quantity * producedRatio);
    const scrap = Math.round(produced * 0.02); // ok. 2% braków

    order.producedQuantity = produced;
    order.scrapQuantity = scrap;
    if (!order.actualStart) {
      order.actualStart = new Date(Date.now() - 6 * 60 * 60 * 1000);
    }
    await orderRepo.save(order);
    updated++;
    console.log(
      `✅ ${order.orderNumber}: wykonano ${produced}/${order.quantity} (braki: ${scrap})`,
    );
  }

  if (updated === 0) {
    console.log('ℹ️ Wszystkie zlecenia mają już ustawiony postęp — nic do zrobienia.');
  }

  console.log('🎉 Seedowanie postępu zleceń zakończone!');
  await app.close();
}

void bootstrap();
