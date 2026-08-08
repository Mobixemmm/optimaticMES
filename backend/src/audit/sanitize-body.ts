const SENSITIVE_KEYS = new Set([
  'password',
  'pin',
  'pincode',
  'pinhash',
  'token',
  'secret',
  'secrets',
  'jwt',
  'passwordhash',
  'apikey',
  'clientsecret',
  'accesstoken',
  'refreshtoken',
  'privatekey',
  'authorization',
]);

// Głębokość istnieje po to, żeby cykliczna albo złośliwie zagnieżdżona struktura
// nie zapętliła interceptora audytu na każdym żądaniu.
const MAX_DEPTH = 6;

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth >= MAX_DEPTH) return '[TOO_DEEP]';
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, depth + 1));
  }
  if (value && typeof value === 'object') {
    const clone: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      clone[key] = SENSITIVE_KEYS.has(key.toLowerCase())
        ? '[REDACTED]'
        : sanitizeValue(nested, depth + 1);
    }
    return clone;
  }
  return value;
}

// Usuwa wartości pól wrażliwych z ciała żądania przed zapisem w dzienniku audytu —
// audyt ma pokazywać CO się zmieniło, nie ujawniać hasła/PIN-u w plaintext.
//
// Schodzi też w zagnieżdżone obiekty i tablice: konfiguracja integracji trzyma
// hasła w podobiekcie (`secrets`), więc płytkie czyszczenie samego pierwszego
// poziomu przepuściłoby je do dziennika w postaci jawnej.
export function sanitizeBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const clone = sanitizeValue(body, 0) as Record<string, unknown>;
  return Object.keys(clone).length > 0 ? clone : null;
}
