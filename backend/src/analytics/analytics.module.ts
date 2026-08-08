import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionOrder } from '../entities/production-order.entity';
import { Operator } from '../entities/operator.entity';
import { OperatorSession } from '../entities/operator-session.entity';
import { MaintenanceTask } from '../entities/maintenance-task.entity';
import { AndonAlert } from '../entities/andon-alert.entity';
import { MachineStopEvent } from '../entities/machine-stop-event.entity';
import { MachinesModule } from '../machines/machines.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsDatasetService } from './analytics-dataset.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductionOrder,
      Operator,
      OperatorSession,
      MaintenanceTask,
      AndonAlert,
      MachineStopEvent,
    ]),
    MachinesModule,
    ShiftsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsDatasetService],
})
export class AnalyticsModule {}
