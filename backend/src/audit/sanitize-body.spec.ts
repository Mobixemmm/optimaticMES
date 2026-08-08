import { sanitizeBody } from './sanitize-body';

describe('sanitizeBody', () => {
  it('redacts known sensitive keys', () => {
    const result = sanitizeBody({
      email: 'admin@optimatic.com',
      password: 'super-secret',
      pinCode: '1234',
    });
    expect(result).toEqual({
      email: 'admin@optimatic.com',
      password: '[REDACTED]',
      pinCode: '[REDACTED]',
    });
  });

  it('is case-insensitive on key matching', () => {
    const result = sanitizeBody({ PASSWORD: 'x', Pin: 'y' });
    expect(result).toEqual({ PASSWORD: '[REDACTED]', Pin: '[REDACTED]' });
  });

  it('leaves non-sensitive fields untouched', () => {
    const result = sanitizeBody({ orderNumber: 'WO-1', quantity: 10 });
    expect(result).toEqual({ orderNumber: 'WO-1', quantity: 10 });
  });

  it('returns null for non-object bodies', () => {
    expect(sanitizeBody(undefined)).toBeNull();
    expect(sanitizeBody(null)).toBeNull();
    expect(sanitizeBody('a string')).toBeNull();
  });

  it('returns null for an empty object', () => {
    expect(sanitizeBody({})).toBeNull();
  });

  it('redacts secrets nested inside objects', () => {
    const result = sanitizeBody({
      name: 'SAP produkcja',
      config: { baseUrl: 'https://erp.example.com', apiKey: 'ABC123' },
      secrets: { password: 'p4ss' },
    });
    expect(result).toEqual({
      name: 'SAP produkcja',
      config: { baseUrl: 'https://erp.example.com', apiKey: '[REDACTED]' },
      secrets: '[REDACTED]',
    });
  });

  it('redacts secrets nested inside arrays', () => {
    const result = sanitizeBody({
      connections: [{ name: 'A', token: 'tok-1' }],
    });
    expect(result).toEqual({
      connections: [{ name: 'A', token: '[REDACTED]' }],
    });
  });

  it('stops descending on absurdly deep payloads', () => {
    let deep: Record<string, unknown> = { value: 'bottom' };
    for (let i = 0; i < 12; i++) deep = { nested: deep };
    expect(JSON.stringify(sanitizeBody(deep))).toContain('[TOO_DEEP]');
  });
});
