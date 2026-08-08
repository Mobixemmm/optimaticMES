import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorData } from '../entities/sensor-data.entity';
import { Tenant } from '../entities/tenant.entity';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';

@Module({
  imports: [TypeOrmModule.forFeature([SensorData, Tenant])],
  controllers: [SensorsController],
  providers: [SensorsService],
})
export class SensorsModule {}
