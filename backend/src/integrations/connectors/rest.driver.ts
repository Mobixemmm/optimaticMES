import { Injectable, BadRequestException } from '@nestjs/common';
import type {
  DriverContext,
  ExternalOrder,
  IntegrationDriver,
  ProgressPayload,
  TestResult,
} from './driver.interface';

// Timeout jest twardy i krótki: panel admina czeka na wynik synchronicznie,
// a zawieszony ERP nie może zablokować wątku obsługującego żądanie.
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ORDERS_PER_SYNC = 1000;

function str(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '');
}

// Wyciąga zagnieżdżoną wartość po ścieżce "data.items" — odpowiedzi ERP rzadko
// są płaską tablicą na najwyższym poziomie.
function atPath(source: unknown, path: string): unknown {
  if (!path) return source;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, source);
}

function parseFieldMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    throw new BadRequestException(
      'Mapowanie pól nie jest poprawnym JSON-em. Przykład: {"orderNumber":"nr_zlecenia"}',
    );
  }
}

@Injectable()
export class RestDriver implements IntegrationDriver {
  readonly key = 'rest';

  private buildHeaders(ctx: DriverContext): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const authType = str(ctx.config.authType) || 'none';
    const token = ctx.secrets.token ?? '';

    if (authType === 'bearer' && token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (authType === 'basic' && token) {
      const username = str(ctx.config.username);
      headers.Authorization =
        'Basic ' + Buffer.from(`${username}:${token}`).toString('base64');
    } else if (authType === 'header' && token) {
      const headerName = str(ctx.config.authHeaderName) || 'X-API-Key';
      headers[headerName] = token;
    }
    return headers;
  }

  private resolveUrl(ctx: DriverContext, path: string): string {
    const baseUrl = str(ctx.config.baseUrl).replace(/\/+$/, '');
    if (!baseUrl) {
      throw new BadRequestException('Adres bazowy API nie jest ustawiony.');
    }
    const suffix = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${baseUrl}${suffix}`);
    // Blokujemy inne schematy niż HTTP(S): konfiguracja pochodzi od użytkownika,
    // a file:// czy ftp:// nie mają tu czego szukać.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new BadRequestException('Adres API musi używać http:// lub https://');
    }
    return url.toString();
  }

  private async request(
    ctx: DriverContext,
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    const url = this.resolveUrl(ctx, path);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...init,
        headers: { ...this.buildHeaders(ctx), ...(init.headers ?? {}) },
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new BadRequestException(
          `System zewnętrzny odpowiedział ${response.status} ${response.statusText}. ${body.slice(0, 200)}`,
        );
      }
      if (response.status === 204) return null;
      return await response.json();
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      const reason = err instanceof Error ? err.message : String(err);
      const detail =
        reason.includes('abort') || reason.includes('Abort')
          ? `przekroczono limit ${REQUEST_TIMEOUT_MS / 1000} s`
          : reason;
      throw new BadRequestException(`Nie udało się połączyć z systemem zewnętrznym: ${detail}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async test(ctx: DriverContext): Promise<TestResult> {
    const path = str(ctx.config.ordersPath) || '/';
    const payload = await this.request(ctx, path);
    const rows = this.extractRows(ctx, payload);
    return {
      ok: true,
      message: `Połączenie działa. Odpowiedź zawiera ${rows.length} rekordów.`,
    };
  }

  private extractRows(ctx: DriverContext, payload: unknown): Record<string, unknown>[] {
    const rootPath = str(ctx.config.rootPath);
    const candidate = atPath(payload, rootPath);
    if (Array.isArray(candidate)) return candidate as Record<string, unknown>[];
    if (Array.isArray(payload)) return payload as Record<string, unknown>[];
    return [];
  }

  async pullOrders(ctx: DriverContext): Promise<ExternalOrder[]> {
    const path = str(ctx.config.ordersPath);
    if (!path) {
      throw new BadRequestException('Ścieżka listy zleceń nie jest ustawiona.');
    }
    const payload = await this.request(ctx, path);
    const rows = this.extractRows(ctx, payload);
    if (rows.length === 0) {
      return [];
    }
    if (rows.length > MAX_ORDERS_PER_SYNC) {
      throw new BadRequestException(
        `System zewnętrzny zwrócił ${rows.length} rekordów (limit ${MAX_ORDERS_PER_SYNC}). ` +
          'Ogranicz zakres po stronie ERP, np. filtrem daty.',
      );
    }

    const map = parseFieldMap(ctx.config.fieldMap);
    const pick = (row: Record<string, unknown>, field: string): unknown =>
      row[map[field] ?? field];

    return rows
      .map((row) => {
        const orderNumber = str(pick(row, 'orderNumber')).trim();
        const quantity = Number(pick(row, 'quantity'));
        const plannedStartRaw = pick(row, 'plannedStart');
        const plannedStart = plannedStartRaw ? new Date(str(plannedStartRaw)) : null;
        const cycleRaw = pick(row, 'idealCycleTimeSec');
        return {
          orderNumber,
          productName: str(pick(row, 'productName')).trim() || '—',
          quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 0,
          plannedStart:
            plannedStart && !Number.isNaN(plannedStart.getTime()) ? plannedStart : null,
          idealCycleTimeSec: cycleRaw != null && Number.isFinite(Number(cycleRaw))
            ? Number(cycleRaw)
            : null,
        };
      })
      // Rekord bez numeru zlecenia albo bez ilości jest nie do zaimportowania —
      // pomijamy go zamiast tworzyć śmieciowe zlecenie "—" na 0 sztuk.
      .filter((order) => order.orderNumber !== '' && order.quantity > 0);
  }

  async pushProgress(ctx: DriverContext, payload: ProgressPayload): Promise<void> {
    const template = str(ctx.config.progressPath);
    if (!template) {
      throw new BadRequestException('Ścieżka raportowania postępu nie jest ustawiona.');
    }
    const path = template.replace('{orderNumber}', encodeURIComponent(payload.orderNumber));
    await this.request(ctx, path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
}
