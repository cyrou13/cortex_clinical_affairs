import { describe, it, expect } from 'vitest';
import { TotpService } from './totp-service.js';
import { TOTP, Secret } from 'otpauth';
import { randomBytes } from 'node:crypto';

const ENCRYPTION_KEY = randomBytes(32).toString('hex');

describe('TotpService', () => {
  const service = new TotpService(ENCRYPTION_KEY);

  describe('generateSecret', () => {
    it('returns secret, otpauth URL, and QR code', async () => {
      const result = await service.generateSecret('test@example.com');
      expect(result.secret).toBeDefined();
      expect(result.secret.length).toBeGreaterThan(10);
      expect(result.otpauthUrl).toContain('otpauth://totp/');
      expect(result.otpauthUrl).toContain('CORTEX');
      expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('verifyToken', () => {
    it('validates a correct TOTP code', async () => {
      const { secret } = await service.generateSecret('test@example.com');
      const totp = new TOTP({
        secret: Secret.fromBase32(secret),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });
      const token = totp.generate();
      expect(service.verifyToken(secret, token)).toBe(true);
    });

    it('rejects an incorrect TOTP code', async () => {
      const { secret } = await service.generateSecret('test@example.com');
      expect(service.verifyToken(secret, '000000')).toBe(false);
    });
  });

  describe('generateRecoveryCodes', () => {
    it('generates 10 codes by default', () => {
      const codes = service.generateRecoveryCodes();
      expect(codes).toHaveLength(10);
    });

    it('generates codes in XXXX-XXXX format', () => {
      const codes = service.generateRecoveryCodes();
      for (const code of codes) {
        expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
      }
    });

    it('generates unique codes', () => {
      const codes = service.generateRecoveryCodes();
      const unique = new Set(codes);
      expect(unique.size).toBe(codes.length);
    });
  });

  describe('encrypt/decrypt', () => {
    it('encrypts and decrypts a secret round-trip', async () => {
      const { secret } = await service.generateSecret('test@example.com');
      const encrypted = service.encryptSecret(secret);
      expect(encrypted).not.toBe(secret);
      expect(encrypted).toContain(':');
      const decrypted = service.decryptSecret(encrypted);
      expect(decrypted).toBe(secret);
    });
  });
});
