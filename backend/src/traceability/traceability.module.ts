import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialConsumption } from '../entities/material-consumption.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { QualityDefect } from '../entities/quality-defect.entity';
import { OperatorSession } from '../entities/operator-session.entity';
import { Operator } from '../entities/operator.entity';
import { TraceabilityController } from './traceability.controller';
import { TraceabilityService } from './traceability.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaterialConsumption,
      InventoryItem,
      ProductionOrder,
      QualityDefect,
      OperatorSession,
      Operator,
    ]),
  ],
  controllers: [TraceabilityController],
  providers: [TraceabilityService],
  exports: [TraceabilityService],
})
export class TraceabilityModule {}
