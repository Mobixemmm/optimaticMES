import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { UserPreference } from '../entities/user-preference.entity';
import { PREFERENCE_KEYS } from './preferences.constants';
import {
  enterTestRequestContext,
  TEST_TENANT_ID,
} from '../common/testing/request-context.testing';

describe('PreferencesService', () => {
  let service: PreferencesService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    enterTestRequestContext();

    repo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data: Partial<UserPreference>) => ({ ...data })),
      save: jest.fn((row: Partial<UserPreference>) => Promise.resolve(row)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        { provide: getRepositoryToken(UserPreference), useValue: repo },
      ],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);
  });

  it('zakłada wiersz przy pierwszym zapisie kolorów', async () => {
    const saved = await service.setChartColors({ failure: '#AABBCC' });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TEST_TENANT_ID,
        userId: 1,
        key: PREFERENCE_KEYS.CHART_COLORS,
      }),
    );
    // Hex normalizujemy, żeby "#AABBCC" i "#aabbcc" nie były w bazie dwoma
    // różnymi wartościami tego samego koloru.
    expect(saved).toEqual({ failure: '#aabbcc' });
  });

  it('nadpisuje istniejący wiersz, zamiast dokładać kolejny', async () => {
    const existing = {
      id: 7,
      tenantId: TEST_TENANT_ID,
      userId: 1,
      key: PREFERENCE_KEYS.CHART_COLORS,
      value: { failure: '#111111' },
    };
    repo.findOne.mockResolvedValue(existing);

    await service.setChartColors({ failure: '#222222', setup: '#333333' });

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        value: { failure: '#222222', setup: '#333333' },
      }),
    );
  });

  it('traktuje przysłaną mapę jako pełny stan — pominięty slot wraca do domyślnego', async () => {
    repo.findOne.mockResolvedValue({
      id: 7,
      tenantId: TEST_TENANT_ID,
      userId: 1,
      key: PREFERENCE_KEYS.CHART_COLORS,
      value: { failure: '#111111', setup: '#222222' },
    });

    const saved = await service.setChartColors({ failure: '#111111' });

    expect(saved).toEqual({ failure: '#111111' });
  });

  it('kasuje wiersz, gdy nie zostało żadne nadpisanie', async () => {
    const saved = await service.setChartColors({});

    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.delete).toHaveBeenCalledWith({
      tenantId: TEST_TENANT_ID,
      userId: 1,
      key: PREFERENCE_KEYS.CHART_COLORS,
    });
    expect(saved).toEqual({});
  });

  it('odrzuca nieznaną przyczynę przestoju', async () => {
    await expect(
      service.setChartColors({ sabotaz: '#aabbcc' }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it.each(['aabbcc', '#abc', 'red', 'rgba(0,0,0,0.5)', '#gggggg'])(
    'odrzuca kolor spoza formatu #rrggbb: %s',
    async (color) => {
      await expect(service.setChartColors({ failure: color })).rejects.toThrow(
        BadRequestException,
      );
    },
  );

  it('zwraca pustą mapę, gdy użytkownik nic nie zmieniał', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.getChartColors()).resolves.toEqual({});
  });

  it('czyta tylko preferencje bieżącego użytkownika i klienta', async () => {
    await service.getAll();

    expect(repo.find).toHaveBeenCalledWith({
      where: { tenantId: TEST_TENANT_ID, userId: 1 },
    });
  });

  it('nie zapisuje preferencji bez zalogowanego użytkownika', async () => {
    enterTestRequestContext({ userId: null });

    await expect(
      service.setChartColors({ failure: '#aabbcc' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
