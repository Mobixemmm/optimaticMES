import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionOrder } from '../entities/production-order.entity';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { MachinesModule } from '../machines/machines.module';
import { ShiftsModule } from '../shifts/shifts.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProductionOrder]), MachinesModule, ShiftsModule],
  controllers: [PlanningController],
  providers: [PlanningService],
  exports: [PlanningService],
})
export class PlanningModule {}
