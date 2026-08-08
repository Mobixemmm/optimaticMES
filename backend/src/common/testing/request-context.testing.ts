import { RequestContextStore, type RequestContext } from '../request-context';
import { ALL_PERMISSIONS } from '../../auth/permissions.constants';

// W testach jednostkowych nie ma żądania HTTP, a więc i guarda, który zakłada
// kontekst. Serwisy domenowe wołają currentTenantId() i bez tego rzucają —
// celowo, bo cichy fallback do tenanta nr 1 byłby dokładnie tym błędem,
// przed którym ma chronić cała ta warstwa.
export const TEST_TENANT_ID = 1;

export function testRequestContext(
  overrides: Partial<RequestContext> = {},
): RequestContext {
  return {
    tenantId: TEST_TENANT_ID,
    userId: 1,
    roleCode: 'admin',
    permissions: [...ALL_PERMISSIONS],
    siteScope: null,
    ...overrides,
  };
}

// Wywoływane w beforeEach danego speca. Nie używa enter()/enterWith(), bo Jest
// uruchamia beforeEach i ciało testu w osobnych łańcuchach async i kontekst
// z AsyncLocalStorage do testu nie dociera.
export function enterTestRequestContext(
  overrides: Partial<RequestContext> = {},
): void {
  RequestContextStore.setTestFallback(testRequestContext(overrides));
}
