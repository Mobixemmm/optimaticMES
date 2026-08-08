import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MachineConfig } from '../entities/machine-config.entity';
import { Machine } from '../entities/machine.entity';
import { MachineConfigsService } from './machine-configs.service';
import { MachineConfigsController } from './machine-configs.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([MachineConfig, Machine]), SettingsModule],
  controllers: [MachineConfigsController],
  providers: [MachineConfigsService],
  // ScrapService pyta stąd, które maszyny liczą odrzut z telemetrii.
  exports: [MachineConfigsService],
})
export class MachineConfigsModule {}
