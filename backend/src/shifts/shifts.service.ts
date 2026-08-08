import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { tenantScope, currentTenantId } from '../common/request-context';
import { Shift } from '../entities/shift.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
  ) {}

  async findAll(): Promise<Shift[]> {
    return this.shiftRepository.find({
      where: tenantScope(),
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!shift) {
      throw new NotFoundException(`Zmiana o ID ${id} nie istnieje`);
    }
    return shift;
  }

  async create(dto: CreateShiftDto): Promise<Shift> {
    return this.shiftRepository.save(
      this.shiftRepository.create({ ...dto, tenantId: currentTenantId() }),
    );
  }

  async update(id: number, dto: UpdateShiftDto): Promise<Shift> {
    const shift = await this.findOne(id);
    Object.assign(shift, dto);
    return this.shiftRepository.save(shift);
  }

  async remove(id: number): Promise<void> {
    const shift = await this.findOne(id);
    await this.shiftRepository.remove(shift);
  }

  // Minuty planowanej pracy w danym dniu tygodnia (0=niedziela..6=sobota),
  // sumując wszystkie aktywne zmiany pokrywające ten dzień. Zmiany przechodzące
  // przez północ liczone są modulo 24h.
  private plannedMinutesForWeekday(dayOfWeek: number, shifts: Shift[]): number {
    return shifts
      .filter((s) => s.isActive && s.dayOfWeek === dayOfWeek)
      .reduce((sum, s) => {
        const start = toMinutes(s.startTime);
        const end = toMinutes(s.endTime);
        const duration = end > start ? end - start : 1440 - start + end;
        return sum + duration;
      }, 0);
  }

  // Planowany czas pracy (w minutach, na JEDNĄ maszynę) dla przedziału dat,
  // liczony wg dnia tygodnia — zakłada, że harmonogram zmian powtarza się co
  // tydzień (brak jeszcze kalendarza świąt/wyjątków).
  async plannedMinutesForRange(start: Date, end: Date): Promise<number> {
    const shifts = await this.findAll();
    let total = 0;
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    while (cursor < end) {
      total += this.plannedMinutesForWeekday(cursor.getDay(), shifts);
      cursor.setDate(cursor.getDate() + 1);
    }
    return total;
  }

  async plannedMinutesForDay(day: Date, shifts?: Shift[]): Promise<number> {
    const allShifts = shifts ?? (await this.findAll());
    return this.plannedMinutesForWeekday(day.getDay(), allShifts);
  }
}
