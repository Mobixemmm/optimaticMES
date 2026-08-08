import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Machine } from '../entities/machine.entity';
import { Tenant } from '../entities/tenant.entity';
import { MachineDataModule } from '../machine-data/machine-data.module';
import { MachinesController } from './machines.controller';
import { MachinesService } from './machines.service';

@Module({
  // Tenant jest potrzebny tylko przy starcie — MachinesService sprawdza, czy
  // wdrożenie jest jednoklienckie, zanim spróbuje auto-adopcji maszyn.
  imports: [TypeOrmModule.forFeature([Machine, Tenant]), MachineDataModule],
  controllers: [MachinesController],
  providers: [MachinesService],
  exports: [MachinesService],
})
export class MachinesModule {}
