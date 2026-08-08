import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Machine } from '../entities/machine.entity';
import { Tenant } from '../entities/tenant.entity';
import { MachineDataService } from '../machine-data/machine-data.service';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';
import {
  RequestContextStore,
  currentTenantId,
  tenantScope,
  assertSiteAllowed,
} from '../common/request-context';

@Injectable()
export class MachinesService implements OnModuleInit {
  private readonly logger = new Logger(MachinesService.name);

  constructor(
    @InjectRepository(Machine)
    private machineRepository: Repository<Machine>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private machineDataService: MachineDataService,
  ) {}

  // Dogrywa do kartoteki maszyny, które już zgłaszają telemetrię, ale nie
  // zostały jeszcze opisane ręcznie — żeby żadna zgłaszająca się maszyna
  // nie "zniknęła" z list tylko dlatego, że admin jeszcze jej nie dodał.
  //
  // Przy wielu klientach nie da się tego zrobić automatycznie: z samego
  // machine_id w telemetrii nie wynika, czyja to maszyna. Dlatego auto-adopcja
  // działa tylko we wdrożeniu jednoklienckim, a w pozostałych przypadkach
  // maszynę trzeba zarejestrować świadomie (POST /machines) — zgadywanie
  // przypisania oznaczałoby pokazanie cudzych danych.
  async onModuleInit(): Promise<void> {
    try {
      const tenants = await this.tenantRepository.find({
        where: { isActive: true },
        select: { id: true },
        take: 2,
      });

      if (tenants.length !== 1) {
        this.logger.log(
          `Pominięto auto-synchronizację kartoteki maszyn: liczba aktywnych klientów = ${tenants.length}. Maszyny dodaj przez POST /machines.`,
        );
        return;
      }

      // Start aplikacji nie jest żądaniem HTTP, więc kontekst trzeba założyć ręcznie.
      await RequestContextStore.run(
        {
          tenantId: tenants[0].id,
          userId: null,
          roleCode: null,
          permissions: [],
          siteScope: null,
        },
        () => this.syncFromTelemetry(),
      );
    } catch (err) {
      this.logger.warn(
        `Pominięto synchronizację kartoteki maszyn z telemetrią przy starcie: ${(err as Error).message}`,
      );
    }
  }

  async syncFromTelemetry(): Promise<number> {
    const tenantId = currentTenantId();
    const telemetryMachineIds = await this.machineDataService.getUnscopedMachineIds();
    if (telemetryMachineIds.length === 0) return 0;

    // Maszyna zarejestrowana przez KTÓREGOKOLWIEK klienta nie jest już wolna —
    // inaczej drugi tenant „adoptowałby" cudze urządzenie i zobaczył jego dane.
    const claimed = await this.machineRepository.find({ select: { machineId: true } });
    const claimedIds = new Set(claimed.map((m) => m.machineId));
    const missing = telemetryMachineIds.filter((id) => !claimedIds.has(id));

    for (const machineId of missing) {
      await this.machineRepository.save(
        this.machineRepository.create({ machineId, name: machineId, tenantId }),
      );
    }
    if (missing.length > 0) {
      this.logger.log(
        `Dodano ${missing.length} maszyn(y) z telemetrii do kartoteki: ${missing.join(', ')}`,
      );
    }
    return missing.length;
  }

  async findAll(): Promise<Machine[]> {
    return this.machineRepository.find({
      where: tenantScope(),
      order: { name: 'ASC' },
    });
  }

  async findAllActive(): Promise<Machine[]> {
    return this.machineRepository.find({
      where: { isActive: true, ...tenantScope() },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Machine> {
    const machine = await this.machineRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!machine) {
      throw new NotFoundException(`Maszyna o ID ${id} nie istnieje`);
    }
    assertSiteAllowed(machine.siteId);
    return machine;
  }

  async findByMachineId(machineId: string): Promise<Machine | null> {
    return this.machineRepository.findOne({
      where: { machineId, ...tenantScope() },
    });
  }

  async create(dto: CreateMachineDto): Promise<Machine> {
    const machine = this.machineRepository.create({
      ...dto,
      tenantId: currentTenantId(),
    });
    assertSiteAllowed(machine.siteId);
    return this.machineRepository.save(machine);
  }

  async update(id: number, dto: UpdateMachineDto): Promise<Machine> {
    const machine = await this.findOne(id);
    Object.assign(machine, dto);
    // Sprawdzenie po przypisaniu: rola o ograniczonym zasięgu nie może
    // przenieść maszyny do zakładu, do którego sama nie ma dostępu.
    assertSiteAllowed(machine.siteId);
    return this.machineRepository.save(machine);
  }

  async remove(id: number): Promise<void> {
    const machine = await this.findOne(id);
    await this.machineRepository.remove(machine);
  }
}
