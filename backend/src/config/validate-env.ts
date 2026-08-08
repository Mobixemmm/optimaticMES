// Walidacja zmiennych środowiskowych przy starcie aplikacji.
// Cel: nie pozwolić wystartować z brakującym sekretem JWT albo z niebezpieczną
// konfiguracją na produkcji (np. cookie bez flagi Secure, otwarty Swagger).
const REQUIRED_VARS = [
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_USERNAME',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
  'JWT_SECRET',
] as const;

const INSECURE_JWT_SECRETS = new Set([
  'replace-with-a-random-secret',
  'secret',
  'changeme',
  'change-me',
]);

export function validateEnv(): void {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Brak wymaganych zmiennych środowiskowych: ${missing.join(', ')}. ` +
        'Sprawdź plik .env (patrz .env.example).',
    );
  }

  const jwtSecret = process.env.JWT_SECRET!;
  if (jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET jest zbyt krótki (min. 32 znaki). Wygeneruj losowy sekret: ' +
        `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`,
    );
  }
  if (INSECURE_JWT_SECRETS.has(jwtSecret)) {
    throw new Error(
      'JWT_SECRET ma wartość domyślną/placeholder. Ustaw prawdziwy losowy sekret przed uruchomieniem.',
    );
  }

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    if (process.env.COOKIE_SECURE !== 'true') {
      throw new Error(
        'NODE_ENV=production wymaga COOKIE_SECURE=true (aplikacja musi być serwowana po HTTPS).',
      );
    }
    if (!process.env.CORS_ORIGINS) {
      throw new Error(
        'NODE_ENV=production wymaga jawnego ustawienia CORS_ORIGINS (brak domyślnych localhost).',
      );
    }
  }
}
