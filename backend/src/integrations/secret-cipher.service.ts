import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
// Etykieta rozdziału domen: klucz wyprowadzony z JWT_SECRET pod tym `info` nie
// da się użyć do podpisania tokenu i odwrotnie, mimo wspólnego materiału.
const HKDF_INFO = 'optimatic-mes:integration-secrets:v1';

/**
 * Szyfrowanie haseł i kluczy API systemów zewnętrznych przed zapisem do bazy.
 *
 * Format zapisu: `v1:<iv-hex>:<tag-hex>:<ciphertext-hex>`. Prefiks wersji jest
 * po to, żeby dało się kiedyś zmienić algorytm bez zgadywania, czym zaszyfrowano
 * stare wiersze.
 */
@Injectable()
export class SecretCipherService {
  private readonly logger = new Logger(SecretCipherService.name);
  private readonly key: Buffer;

  constructor() {
    this.key = this.resolveKey();
  }

  private resolveKey(): Buffer {
    const explicit = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (explicit) {
      const key = Buffer.from(explicit, 'hex');
      if (key.length !== KEY_LENGTH) {
        throw new Error(
          'INTEGRATION_ENCRYPTION_KEY musi mieć 32 bajty zapisane szesnastkowo (64 znaki). ' +
            `Wygeneruj: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
        );
      }
      return key;
    }

    // Brak dedykowanego klucza nie może wywalić istniejących instalacji, więc
    // wyprowadzamy go z JWT_SECRET — ale przez HKDF z własną etykietą, żeby nie
    // był to ten sam klucz co do podpisywania tokenów.
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error(
        'Do szyfrowania sekretów integracji potrzebny jest INTEGRATION_ENCRYPTION_KEY albo JWT_SECRET.',
      );
    }
    this.logger.warn(
      'INTEGRATION_ENCRYPTION_KEY nie jest ustawiony — klucz wyprowadzam z JWT_SECRET. ' +
        'Ustaw dedykowany klucz: rotacja JWT_SECRET unieważni zapisane hasła do systemów zewnętrznych.',
    );
    return Buffer.from(
      hkdfSync('sha256', Buffer.from(jwtSecret), Buffer.alloc(0), HKDF_INFO, KEY_LENGTH),
    );
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(payload: string): string {
    const parts = payload.split(':');
    if (parts.length !== 4 || parts[0] !== 'v1') {
      throw new InternalServerErrorException(
        'Zapisany sekret integracji ma nieznany format — prawdopodobnie pochodzi z innej wersji szyfrowania.',
      );
    }
    const [, ivHex, tagHex, dataHex] = parts;
    try {
      const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivHex, 'hex'));
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      return Buffer.concat([
        decipher.update(Buffer.from(dataHex, 'hex')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      // Najczęstsza przyczyna: zmieniony JWT_SECRET przy wyprowadzanym kluczu.
      throw new InternalServerErrorException(
        'Nie udało się odszyfrować sekretu integracji. Jeśli zmieniono JWT_SECRET lub ' +
          'INTEGRATION_ENCRYPTION_KEY, wprowadź dane logowania do systemu zewnętrznego ponownie.',
      );
    }
  }

  encryptObject(value: Record<string, string>): string {
    return this.encrypt(JSON.stringify(value));
  }

  decryptObject(payload: string | null): Record<string, string> {
    if (!payload) return {};
    const parsed: unknown = JSON.parse(this.decrypt(payload));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  }
}
