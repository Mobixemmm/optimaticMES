import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorData } from '../entities/sensor-data.entity';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';

@Module({
    imports: [TypeOrmModule.forFeature([SensorData])],
    controllers: [SensorsController],
    providers: [SensorsService],
})
export class SensorsModule {}