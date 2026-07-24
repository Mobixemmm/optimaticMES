import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorData } from '../entities/sensor-data.entity';

@Injectable()
export class SensorsService implements OnModuleInit {
    constructor(
        @InjectRepository(SensorData)
        private sensorRepository: Repository<SensorData>,
    ) {}

    // Automatycznie startuje przy uruchomieniu aplikacji
    onModuleInit() {
        console.log('🌡️  Symulacja czujnika uruchomiona (co 5 sekund)');
        setInterval(() => {
            this.simulateTemperature().then(data => {
                console.log(`📊 ${data.sensorName}: ${data.value}${data.unit} o ${data.timestamp.toLocaleTimeString()}`);
            });
        }, 5000); // co 5 sekund
    }

    async create(data: Partial<SensorData>): Promise<SensorData> {
        const reading = this.sensorRepository.create(data);
        return this.sensorRepository.save(reading);
    }

    async findLatest(limit: number = 50): Promise<SensorData[]> {
        return this.sensorRepository.find({
            order: { timestamp: 'DESC' },
            take: limit,
        });
    }

    async simulateTemperature(): Promise<SensorData> {
        const temp = +(60 + Math.random() * 35).toFixed(2);
        
        return this.create({
            sensorName: 'Termometr_Linia1',
            value: temp,
            unit: '°C',
            location: 'Linia produkcyjna 1',
        });
    }
}