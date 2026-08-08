import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { ShiftsService } from './shifts.service';
import { Shift } from '../entities/shift.entity';
import { enterTestRequestContext } from '../common/testing/request-context.testing';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepo = <T extends ObjectLiteral>(): MockRepo<T> => ({
  find: jest.fn(),
});

function shift(overrides: Partial<Shift>): Shift {
  return {
    id: 1,
    tenantId: 1,
    name: 'Zmiana',
    dayOfWeek: 1,
    startTime: '06:00',
    endTime: '14:00',
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('ShiftsService', () => {
  let service: ShiftsService;
  let repo: MockRepo<Shift>;

  beforeEach(async () => {
    enterTestRequestContext();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        { provide: getRepositoryToken(Shift), useValue: createMockRepo<Shift>() },
      ],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
    repo = module.get(getRepositoryToken(Shift));
  });

  describe('plannedMinutesForDay', () => {
    it('sums multiple active shifts on the same weekday', async () => {
      const shifts = [
        shift({ dayOfWeek: 1, startTime: '06:00', endTime: '14:00' }), // 8h
        shift({ dayOfWeek: 1, startTime: '14:00', endTime: '22:00' }), // 8h
      ];
      const monday = new Date('2026-08-03T10:00:00'); // a Monday
      const minutes = await service.plannedMinutesForDay(monday, shifts);
      expect(minutes).toBe(16 * 60);
    });

    it('ignores inactive shifts', async () => {
      const shifts = [
        shift({ dayOfWeek: 1, startTime: '06:00', endTime: '14:00', isActive: false }),
      ];
      const monday = new Date('2026-08-03T10:00:00');
      const minutes = await service.plannedMinutesForDay(monday, shifts);
      expect(minutes).toBe(0);
    });

    it('ignores shifts on other weekdays', async () => {
      const shifts = [shift({ dayOfWeek: 2, startTime: '06:00', endTime: '14:00' })];
      const monday = new Date('2026-08-03T10:00:00');
      const minutes = await service.plannedMinutesForDay(monday, shifts);
      expect(minutes).toBe(0);
    });

    it('handles a shift crossing midnight', async () => {
      // 22:00 -> 06:00 next day = 8h, counted on the day it starts
      const shifts = [shift({ dayOfWeek: 5, startTime: '22:00', endTime: '06:00' })];
      const friday = new Date('2026-08-07T10:00:00'); // a Friday
      const minutes = await service.plannedMinutesForDay(friday, shifts);
      expect(minutes).toBe(8 * 60);
    });

    it('fetches shifts from the repository when none are passed in', async () => {
      (repo.find as jest.Mock).mockResolvedValue([
        shift({ dayOfWeek: 1, startTime: '06:00', endTime: '14:00' }),
      ]);
      const monday = new Date('2026-08-03T10:00:00');
      const minutes = await service.plannedMinutesForDay(monday);
      expect(repo.find).toHaveBeenCalled();
      expect(minutes).toBe(8 * 60);
    });
  });

  describe('plannedMinutesForRange', () => {
    it('sums planned minutes across every day in the range', async () => {
      (repo.find as jest.Mock).mockResolvedValue([
        shift({ dayOfWeek: 1, startTime: '06:00', endTime: '14:00' }), // Monday, 8h
        shift({ dayOfWeek: 2, startTime: '06:00', endTime: '14:00' }), // Tuesday, 8h
      ]);
      const start = new Date('2026-08-03T00:00:00'); // Monday
      const end = new Date('2026-08-05T00:00:00'); // exclusive, covers Mon+Tue
      const minutes = await service.plannedMinutesForRange(start, end);
      expect(minutes).toBe(16 * 60);
    });
  });
});
