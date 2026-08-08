import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SensorsService } from './sensors.service';
import { SensorData } from '../entities/sensor-data.entity';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Czujniki')
@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.SENSORS_READ)
  @ApiOperation({ summary: 'Pobierz ostatnie odczyty' })
  async findLatest(): Promise<SensorData[]> {
    return this.sensorsService.findLatest();
  }

  // Tylko do celów deweloperskich/demo — wyłączone na produkcji przez guard w serwisie
  // (SENSOR_SIMULATION musi być ustawione na 'true'), niezależnie od roli wołającego.
  @Post('simulate')
  @RequirePermission(PERMISSIONS.MACHINES_CONTROL)
  @ApiOperation({ summary: '[DEV] Wygeneruj testowy odczyt temperatury' })
  async simulate(): Promise<SensorData> {
    return this.sensorsService.simulateTemperature();
  }
}
