import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MachineData } from '../entities/machine-data.entity';
import { MachineDataController } from './machine-data.controller';
import { MachineDataService } from './machine-data.service';

@Module({
  imports: [TypeOrmModule.forFeature([MachineData])],
  controllers: [MachineDataController],
  providers: [MachineDataService],
  exports: [MachineDataService],
})
export class MachineDataModule {}
