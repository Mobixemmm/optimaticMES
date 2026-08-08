import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { tenantScope, currentTenantId } from '../common/request-context';
import {
  MachineStopEvent,
  StopReason,
} from '../entities/machine-stop-event.entity';
import { StartMachineStopDto } from './dto/start-machine-stop.dto';
import { AndonService } from '../andon/andon.service';

const REASON_LABELS: Record<StopReason, string> = {
  failure: 'Awaria',
  setup: 'Przezbrojenie',
  material: 'Brak materiału',
  micro_stop: 'Mikroprzestój',
  quality: 'Jakość',
  planned: 'Planowany postój',
};

// Naruszenie ograniczenia UNIQUE w PostgreSQL.
const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === PG_UNIQUE_VIOLATION;
}

@Injectable()
export class MachineStopsService {
  constructor(
    @InjectRepository(MachineStopEvent)
    private stopRepository: Repository<MachineStopEvent>,
    private andonService: AndonService,
  ) {}

  async findCurrent(machine: string): Promise<MachineStopEvent | null> {
    return this.stopRepository.findOne({
      where: { machine, endFailure: IsNull(), ...tenantScope() },
      order: { startFailure: 'DESC' },
    });
  }

  async findAll(sinceDate?: Date): Promise<MachineStopEvent[]> {
    const query = this.stopRepository
      .createQueryBuilder('stop')
      .where('stop.tenantId = :tenantId', { tenantId: currentTenantId() })
      .orderBy('stop.startFailure', 'DESC');
    if (sinceDate) {
      query.andWhere('stop.startFailure >= :sinceDate', { sinceDate });
    }
    return query.getMany();
  }

  async start(
    machine: string,
    dto: StartMachineStopDto,
  ): Promise<MachineStopEvent> {
    // Zamknij ewentualny otwarty przestój tej maszyny przed otwarciem nowego
    await this.endActive(machine);

    const stop = this.stopRepository.create({
      machine,
      tenantId: currentTenantId(),
      reason: dto.reason,
      notes: dto.notes ?? null,
      startFailure: new Date(),
      endFailure: null,
    });

    let saved: MachineStopEvent;
    try {
      saved = await this.stopRepository.save(stop);
    } catch (error) {
      // Panel operatorski stoi na ekranie dotykowym, więc podwójne stuknięcie w
      // "Awaria" to codzienność — dwa równoległe żądania mijają się na
      // endActive() i drugie wpada na uq_machine_stop_events_open. Zgłoszenie
      // przestoju jest wtedy już spełnione, więc oddajemy trwający wpis zamiast
      // rzucać 500 w twarz operatorowi.
      if (!isUniqueViolation(error)) throw error;
      const existing = await this.findCurrent(machine);
      if (existing) return existing;
      throw error;
    }

    if (dto.reason === 'failure') {
      await this.andonService.create({
        type: 'Awaria',
        machineId: machine,
        message: `${machine} — zgłoszono awarię${dto.notes ? `: ${dto.notes}` : ''}`,
        tone: 'err',
      });
    }

    return saved;
  }

  async endActive(machine: string): Promise<MachineStopEvent | null> {
    const active = await this.findCurrent(machine);
    if (!active) return null;
    active.endFailure = new Date();
    return this.stopRepository.save(active);
  }

  async remove(id: number): Promise<void> {
    const stop = await this.stopRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!stop) {
      throw new NotFoundException(`Zdarzenie przestoju o ID ${id} nie istnieje`);
    }
    await this.stopRepository.remove(stop);
  }
}

export { REASON_LABELS };
