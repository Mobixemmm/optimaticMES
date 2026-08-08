import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BomItem } from '../entities/bom-item.entity';
import { MaterialConsumption } from '../entities/material-consumption.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { BomController } from './bom.controller';
import { BomService } from './bom.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BomItem, MaterialConsumption, InventoryItem, ProductionOrder]),
  ],
  controllers: [BomController],
  providers: [BomService],
  exports: [BomService],
})
export class BomModule {}
