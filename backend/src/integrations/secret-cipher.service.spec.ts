import { InternalServerErrorException } from '@nestjs/common';
import { SecretCipherService } from './secret-cipher.service';

const KEY_A = 'a'.repeat(64);
const KEY_B = 'b'.repeat(64);

describe('SecretCipherService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function serviceWith(key?: string, jwtSecret?: string): SecretCipherService {
    delete process.env.INTEGRATION_ENCRYPTION_KEY;
    delete process.env.JWT_SECRET;
    if (key) process.env.INTEGRATION_ENCRYPTION_KEY = key;
    if (jwtSecret) process.env.JWT_SECRET = jwtSecret;
    return new SecretCipherService();
  }

  it('odszyfrowuje to, co zaszyfrował', () => {
    const cipher = serviceWith(KEY_A);
    expect(cipher.decrypt(cipher.encrypt('haslo-do-sap'))).toBe('haslo-do-sap');
  });

  it('nie zwraca szyfrogramu identycznego dla tej samej wartości', () => {
    const cipher = serviceWith(KEY_A);
    // Losowy IV — dwa zapisy tego samego hasła nie mogą wyglądać tak samo,
    // bo inaczej z samej bazy dałoby się wyczytać, że dwa systemy mają wspólne hasło.
    expect(cipher.encrypt('tajne')).not.toBe(cipher.encrypt('tajne'));
  });

  it('obsługuje worek sekretów jako obiekt', () => {
    const cipher = serviceWith(KEY_A);
    const payload = cipher.encryptObject({ token: 'abc', extra: 'x' });
    expect(cipher.decryptObject(payload)).toEqual({ token: 'abc', extra: 'x' });
  });

  it('zwraca pusty obiekt dla braku sekretów', () => {
    expect(serviceWith(KEY_A).decryptObject(null)).toEqual({});
  });

  it('odrzuca szyfrogram naruszony po zapisie', () => {
    const cipher = serviceWith(KEY_A);
    const encrypted = cipher.encrypt('tajne');
    const parts = encrypted.split(':');
    parts[3] = parts[3].replace(/.$/, (c) => (c === '0' ? '1' : '0'));

    expect(() => cipher.decrypt(parts.join(':'))).toThrow(InternalServerErrorException);
  });

  it('nie odszyfrowuje danych zaszyfrowanych innym kluczem', () => {
    const encrypted = serviceWith(KEY_A).encrypt('tajne');
    expect(() => serviceWith(KEY_B).decrypt(encrypted)).toThrow(InternalServerErrorException);
  });

  it('odrzuca klucz o złej długości', () => {
    expect(() => serviceWith('deadbeef')).toThrow(/32 bajty/);
  });

  it('wyprowadza klucz z JWT_SECRET, gdy brak dedykowanego', () => {
    const cipher = serviceWith(undefined, 'x'.repeat(48));
    expect(cipher.decrypt(cipher.encrypt('fallback'))).toBe('fallback');
  });

  it('klucz wyprowadzony różni się od surowego JWT_SECRET', () => {
    const jwtSecret = 'x'.repeat(48);
    const encrypted = serviceWith(undefined, jwtSecret).encrypt('tajne');
    // Gdyby HKDF nie zadziałał i użyto wprost JWT_SECRET jako klucza, ten
    // szyfrogram dałby się odczytać kluczem złożonym z tego samego materiału.
    const rawKeyHex = Buffer.from(jwtSecret.slice(0, 32)).toString('hex');
    expect(() => serviceWith(rawKeyHex).decrypt(encrypted)).toThrow();
  });
});
