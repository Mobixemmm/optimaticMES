import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScrapEvent } from '../entities/scrap-event.entity';
import { ScrapCategory } from '../entities/scrap-category.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { ScrapService } from './scrap.service';
import { ScrapController } from './scrap.controller';
import { MachineConfigsModule } from '../machine-configs/machine-configs.module';
import { MachineDataModule } from '../machine-data/machine-data.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScrapEvent, ScrapCategory, ProductionOrder]),
    MachineConfigsModule,
    MachineDataModule,
  ],
  controllers: [ScrapController],
  providers: [ScrapService],
  exports: [ScrapService],
})
export class ScrapModule {}
