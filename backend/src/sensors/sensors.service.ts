import {
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorData } from '../entities/sensor-data.entity';
import { Tenant } from '../entities/tenant.entity';
import {
  RequestContextStore,
  currentTenantId,
  tenantScope,
} from '../common/request-context';

@Injectable()
export class SensorsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SensorsService.name);
  private simulationInterval?: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(SensorData)
    private sensorRepository: Repository<SensorData>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  private get simulationEnabled(): boolean {
    return process.env.SENSOR_SIMULATION === 'true';
  }

  // Symulacja jest tylko narzędziem deweloperskim/demo — na hali dane trafiają
  // z prawdziwych czujników przez gateway. Domyślnie wyłączona; włączana jawnie
  // przez SENSOR_SIMULATION=true w .env, nigdy na produkcji.
  async onModuleInit(): Promise<void> {
    if (!this.simulationEnabled) {
      this.logger.log('Symulacja czujnika wyłączona (SENSOR_SIMULATION != true)');
      return;
    }

    // Odczyt musi trafić do konkretnego klienta, a timer nie ma kontekstu
    // żądania. Przy wielu klientach nie ma sensownego wyboru "do którego",
    // więc symulacja po prostu nie startuje.
    const tenants = await this.tenantRepository.find({
      where: { isActive: true },
      select: { id: true },
      take: 2,
    });
    if (tenants.length !== 1) {
      this.logger.log(
        `Symulacja czujnika pominięta: liczba aktywnych klientów = ${tenants.length}`,
      );
      return;
    }
    const tenantId = tenants[0].id;

    this.logger.warn('Symulacja czujnika uruchomiona (co 5 sekund) — tylko dev/demo');
    this.simulationInterval = setInterval(() => {
      RequestContextStore.run(
        { tenantId, userId: null, roleCode: null, permissions: [], siteScope: null },
        () =>
          this.simulateTemperature()
            .then((data) => {
              this.logger.debug(
                `${data.sensorName}: ${data.value}${data.unit} o ${data.timestamp.toLocaleTimeString()}`,
              );
            })
            .catch((err: unknown) => this.logger.error('Błąd symulacji czujnika', err)),
      );
    }, 5000);
  }

  onModuleDestroy() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
  }

  async create(data: Partial<SensorData>): Promise<SensorData> {
    const reading = this.sensorRepository.create({
      ...data,
      tenantId: currentTenantId(),
    });
    return this.sensorRepository.save(reading);
  }

  async findLatest(limit: number = 50): Promise<SensorData[]> {
    return this.sensorRepository.find({
      where: tenantScope(),
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async simulateTemperature(): Promise<SensorData> {
    if (!this.simulationEnabled) {
      throw new ForbiddenException(
        'Symulacja czujnika jest wyłączona (SENSOR_SIMULATION != true)',
      );
    }
    const temp = +(60 + Math.random() * 35).toFixed(2);

    return this.create({
      sensorName: 'Termometr_Linia1',
      value: temp,
      unit: '°C',
      location: 'Linia produkcyjna 1',
    });
  }
}
