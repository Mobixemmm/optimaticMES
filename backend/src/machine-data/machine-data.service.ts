import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { MachineData } from '../entities/machine-data.entity';
import { currentTenantId } from '../common/request-context';

// Tabela machine_data to hypertable TimescaleDB zapisywana przez gateway po
// samym stringu machine_id — świadomie nie dokładamy jej kolumny tenant_id
// (ALTER na tabeli szeregów czasowych plus zmiana kontraktu z gatewayem).
// Przynależność telemetrii do klienta wynika więc z kartoteki `machines`:
// maszyna należy do tego tenanta, który ją zarejestrował. Każde zapytanie
// przechodzi przez to zawężenie, więc telemetria nieznanej maszyny jest
// niewidoczna dla wszystkich, dopóki ktoś nie doda jej do kartoteki.
const TENANT_SCOPE_SQL =
  'md.machine_id IN (SELECT m.machine_id FROM machines m WHERE m.tenant_id = :tenantId)';

@Injectable()
export class MachineDataService {
  constructor(
    @InjectRepository(MachineData)
    private machineDataRepository: Repository<MachineData>,
  ) {}

  private scoped(): SelectQueryBuilder<MachineData> {
    return this.machineDataRepository
      .createQueryBuilder('md')
      .where(TENANT_SCOPE_SQL, { tenantId: currentTenantId() });
  }

  async findLatest(
    machineId?: string,
    limit: number = 100,
  ): Promise<MachineData[]> {
    const query = this.scoped().orderBy('md.time', 'DESC').take(limit);

    if (machineId) {
      query.andWhere('md.machine_id = :machineId', { machineId });
    }

    return query.getMany();
  }

  async findByTag(
    machineId: string,
    tagName: string,
    limit: number = 100,
  ): Promise<MachineData[]> {
    return this.scoped()
      .andWhere('md.machine_id = :machineId', { machineId })
      .andWhere('md.tag_name = :tagName', { tagName })
      .orderBy('md.time', 'DESC')
      .take(limit)
      .getMany();
  }

  // Próbki jednego tagu OD wskazanego momentu, rosnąco. Odwrotność findByTag
  // (najnowsze N malejąco): ingest odrzutu z licznika musi iść po kolei od
  // kursora w przód, bo liczy PRZYROSTY, a nie ostatnią wartość.
  async findByTagSince(
    machineId: string,
    tagName: string,
    since: Date | null,
    limit = 1000,
  ): Promise<MachineData[]> {
    const query = this.scoped()
      .andWhere('md.machine_id = :machineId', { machineId })
      .andWhere('md.tag_name = :tagName', { tagName })
      .orderBy('md.time', 'ASC')
      .take(limit);

    if (since) {
      query.andWhere('md.time > :since', { since });
    }
    return query.getMany();
  }

  async getMachines(): Promise<string[]> {
    const result = await this.scoped()
      .select('DISTINCT md.machine_id', 'machine_id')
      .getRawMany<{ machine_id: string }>();

    return result.map((r) => r.machine_id);
  }

  // Lista wszystkich machine_id obecnych w telemetrii, BEZ zawężenia do
  // kartoteki — używana wyłącznie przez MachinesService.syncFromTelemetry(),
  // czyli w miejscu, które dopiero przypisuje nowe maszyny do klienta.
  async getUnscopedMachineIds(): Promise<string[]> {
    const result = await this.machineDataRepository
      .createQueryBuilder('md')
      .select('DISTINCT md.machine_id', 'machine_id')
      .getRawMany<{ machine_id: string }>();

    return result.map((r) => r.machine_id);
  }

  async getTags(machineId: string): Promise<string[]> {
    const result = await this.scoped()
      .select('DISTINCT md.tag_name', 'tag_name')
      .andWhere('md.machine_id = :machineId', { machineId })
      .getRawMany<{ tag_name: string }>();

    return result.map((r) => r.tag_name);
  }

  async getLatestValues(machineId: string): Promise<Record<string, any>> {
    const latest = await this.scoped()
      .distinctOn(['md.tag_name'])
      .andWhere('md.machine_id = :machineId', { machineId })
      .orderBy('md.tag_name', 'ASC')
      .addOrderBy('md.time', 'DESC')
      .getMany();

    const result: Record<string, any> = {};
    for (const row of latest) {
      result[row.tag_name] = {
        value: row.value_num ?? row.value_bool ?? row.value_text,
        time: row.time,
      };
    }
    return result;
  }
}
