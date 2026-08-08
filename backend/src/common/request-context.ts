import { AsyncLocalStorage } from 'node:async_hooks';
import { ForbiddenException, InternalServerErrorException } from '@nestjs/common';

// Kontekst pojedynczego żądania: kto pyta, w imieniu jakiego klienta (tenanta)
// i do jakich zakładów ma dostęp. Trzymamy go w AsyncLocalStorage zamiast
// przekazywać przez wszystkie sygnatury serwisów — dzięki temu żaden serwis nie
// da się wywołać "bez tenanta przez przypadek": currentTenantId() rzuca, gdy
// kontekstu nie ma, zamiast po cichu podstawić 1 i wyciec dane innego klienta.
export interface RequestContext {
  tenantId: number;
  userId: number | null;
  roleCode: string | null;
  permissions: string[];
  // null = dostęp do wszystkich zakładów tenanta; tablica = ograniczenie
  // (np. brygadzista widzi tylko swoją halę).
  siteScope: number[] | null;
}

const storage = new AsyncLocalStorage<RequestContext>();

// Jest woła beforeEach i samo `it` z osobnych łańcuchów async, więc kontekst
// założony przez enterWith() w beforeEach NIE dociera do ciała testu. Zamiast
// owijać każde wywołanie serwisu w run(), testy ustawiają ten fallback.
// Zabezpieczenie przed użyciem go na produkcji jest twarde: setTestFallback()
// rzuca poza NODE_ENV=test, więc "domyślny tenant" nie ma jak wyciec do runtime.
let testFallback: RequestContext | null = null;

// Klucz, pod którym RequestContextGuard przypina kontekst do obiektu żądania.
// Guardy wykonują się PRZED interceptorami, a AsyncLocalStorage jeszcze wtedy
// nie działa (patrz komentarz przy RequestContextInterceptor), więc guard
// odkłada wynik na `req`, a interceptor dopiero zakłada z niego ALS.
export const REQUEST_CONTEXT_KEY = '__mesRequestContext';

export function attachContextToRequest(
  request: Record<string, unknown>,
  context: RequestContext,
): void {
  request[REQUEST_CONTEXT_KEY] = context;
}

export function contextFromRequest(
  request: Record<string, unknown>,
): RequestContext | undefined {
  return request[REQUEST_CONTEXT_KEY] as RequestContext | undefined;
}

export const RequestContextStore = {
  // Używane przez RequestContextInterceptor, testy, seedy i skrypty CLI.
  run<T>(context: RequestContext, fn: () => T): T {
    return storage.run(context, fn);
  },

  get(): RequestContext | undefined {
    return storage.getStore() ?? testFallback ?? undefined;
  },

  setTestFallback(context: RequestContext | null): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'setTestFallback() jest dostępne wyłącznie w testach (NODE_ENV=test)',
      );
    }
    testFallback = context;
  },
};

export function currentContext(): RequestContext {
  const context = storage.getStore() ?? testFallback;
  if (!context) {
    // To nie jest błąd użytkownika tylko błąd programisty — endpoint albo skrypt
    // ominął RequestContextGuard / RequestContextStore.run().
    throw new InternalServerErrorException(
      'Brak kontekstu żądania — operacja wymaga ustalonego tenanta',
    );
  }
  return context;
}

export function currentTenantId(): number {
  return currentContext().tenantId;
}

export function currentUserId(): number | null {
  return currentContext().userId;
}

// Zwraca warunek `where` dla zapytań TypeORM: { tenantId: 42 }. Serwisy domenowe
// dokładają go do każdego find/update/delete, żeby zapytanie nigdy nie wyszło
// poza dane bieżącego klienta.
export function tenantScope(): { tenantId: number } {
  return { tenantId: currentTenantId() };
}

// Sprawdza, czy bieżący użytkownik ma prawo dotknąć danego zakładu. Rola bez
// ograniczenia zasięgu (siteScope === null) widzi wszystkie zakłady tenanta.
export function assertSiteAllowed(siteId: number | null | undefined): void {
  if (siteId === null || siteId === undefined) {
    return;
  }
  const { siteScope } = currentContext();
  if (siteScope !== null && !siteScope.includes(siteId)) {
    throw new ForbiddenException('Brak dostępu do wskazanego zakładu');
  }
}

export function hasPermission(permission: string): boolean {
  return currentContext().permissions.includes(permission);
}
