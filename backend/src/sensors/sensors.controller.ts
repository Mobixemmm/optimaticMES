import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SensorsService } from './sensors.service';
import { SensorData } from '../entities/sensor-data.entity';

@ApiTags('Czujniki')
@Controller('sensors')
export class SensorsController {
    constructor(private readonly sensorsService: SensorsService) {}

    @Get()
    @ApiOperation({ summary: 'Pobierz ostatnie odczyty' })
    async findLatest(): Promise<SensorData[]> {
        return this.sensorsService.findLatest();
    }

    @Post('simulate')
    @ApiOperation({ summary: 'Wygeneruj testowy odczyt temperatury' })
    async simulate(): Promise<SensorData> {
        return this.sensorsService.simulateTemperature();
    }
}