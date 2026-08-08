import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MachineStopEvent } from '../entities/machine-stop-event.entity';
import { MachineStopsController } from './machine-stops.controller';
import { MachineStopsService } from './machine-stops.service';
import { AndonModule } from '../andon/andon.module';

@Module({
  imports: [TypeOrmModule.forFeature([MachineStopEvent]), AndonModule],
  controllers: [MachineStopsController],
  providers: [MachineStopsService],
  exports: [MachineStopsService],
})
export class MachineStopsModule {}
