import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreference } from '../entities/user-preference.entity';
import { currentTenantId, currentUserId } from '../common/request-context';
import {
  CHART_COLOR_SLOTS,
  HEX_COLOR_PATTERN,
  PREFERENCE_KEYS,
  type PreferenceKey,
} from './preferences.constants';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(UserPreference)
    private readonly preferenceRepository: Repository<UserPreference>,
  ) {}

  /** Wszystkie preferencje zalogowanego użytkownika, spłaszczone do { klucz: wartość }. */
  async getAll(): Promise<Record<string, Record<string, unknown>>> {
    const rows = await this.preferenceRepository.find({
      where: { tenantId: currentTenantId(), userId: this.userId() },
    });
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async get(key: PreferenceKey): Promise<Record<string, unknown>> {
    const row = await this.preferenceRepository.findOne({
      where: { tenantId: currentTenantId(), userId: this.userId(), key },
    });
    return row?.value ?? {};
  }

  /**
   * Zapis preferencji. Pierwsza zmiana zakłada wiersz, każda kolejna go
   * aktualizuje — indeks unikalny (tenant, user, klucz) sprawia, że historia
   * wyborów nie narasta, a odczyt nie musi szukać "najnowszego" wpisu.
   */
  async set(
    key: PreferenceKey,
    value: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const tenantId = currentTenantId();
    const userId = this.userId();

    const existing = await this.preferenceRepository.findOne({
      where: { tenantId, userId, key },
    });

    const row =
      existing ??
      this.preferenceRepository.create({ tenantId, userId, key, value });
    row.value = value;

    await this.preferenceRepository.save(row);
    return row.value;
  }

  /** Usunięcie wiersza = powrót do wartości domyślnych, a nie zapis pustki. */
  async remove(key: PreferenceKey): Promise<void> {
    await this.preferenceRepository.delete({
      tenantId: currentTenantId(),
      userId: this.userId(),
      key,
    });
  }

  // --- Kolory wykresów -----------------------------------------------------

  getChartColors(): Promise<Record<string, unknown>> {
    return this.get(PREFERENCE_KEYS.CHART_COLORS);
  }

  /**
   * Zapisuje nadpisania kolorów legendy. Przysłana mapa jest pełnym stanem
   * nadpisań, nie łatką: slot, którego w niej nie ma, wraca do domyślnego
   * koloru motywu. Dzięki temu "przywróć jeden slot" nie potrzebuje osobnego
   * endpointu, a UI nigdy nie musi zgadywać, co zostało w bazie.
   */
  async setChartColors(
    colors: Record<string, string>,
  ): Promise<Record<string, string>> {
    const normalized: Record<string, string> = {};

    for (const [slot, value] of Object.entries(colors)) {
      if (
        !CHART_COLOR_SLOTS.includes(slot as (typeof CHART_COLOR_SLOTS)[number])
      ) {
        throw new BadRequestException(
          `Nieznana przyczyna przestoju: ${slot}. Dozwolone: ${CHART_COLOR_SLOTS.join(', ')}`,
        );
      }
      if (typeof value !== 'string' || !HEX_COLOR_PATTERN.test(value)) {
        throw new BadRequestException(
          `Kolor dla "${slot}" musi być zapisany jako #rrggbb, otrzymano: ${String(value)}`,
        );
      }
      normalized[slot] = value.toLowerCase();
    }

    // Pusta mapa znaczy "wszystko domyślne" — trzymanie takiego wiersza tylko
    // udawałoby, że użytkownik coś wybrał.
    if (Object.keys(normalized).length === 0) {
      await this.remove(PREFERENCE_KEYS.CHART_COLORS);
      return {};
    }

    const saved = await this.set(PREFERENCE_KEYS.CHART_COLORS, normalized);
    return saved as Record<string, string>;
  }

  async resetChartColors(): Promise<Record<string, string>> {
    await this.remove(PREFERENCE_KEYS.CHART_COLORS);
    return {};
  }

  // Preferencja bez właściciela nie istnieje. Endpointy są za globalnym
  // JwtAuthGuard, więc to zabezpieczenie na wypadek wywołania serwisu z miejsca,
  // które ominęło guarda (skrypt, cron) — lepiej niż zapis na userId = null.
  private userId(): number {
    const userId = currentUserId();
    if (userId === null) {
      throw new UnauthorizedException(
        'Preferencje są przypisane do użytkownika — wymagane zalogowanie',
      );
    }
    return userId;
  }
}
