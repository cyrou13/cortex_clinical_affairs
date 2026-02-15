import { TOTP, Secret } from 'otpauth';
import QRCode from 'qrcode';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const ISSUER = 'CORTEX Clinical Affairs';
const ALGORITHM = 'aes-256-gcm';

export interface TotpSetupResult {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export class TotpService {
  constructor(private readonly encryptionKey: string) {}

  async generateSecret(userEmail: string): Promise<TotpSetupResult> {
    const secret = new Secret();
    const totp = new TOTP({
      issuer: ISSUER,
      label: userEmail,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    const otpauthUrl = totp.toString();
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      secret: secret.base32,
      otpauthUrl,
      qrCodeDataUrl,
    };
  }

  verifyToken(secret: string, token: string): boolean {
    const totp = new TOTP({
      issuer: ISSUER,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  }

  generateRecoveryCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const bytes = randomBytes(4);
      const hex = bytes.toString('hex').toUpperCase();
      codes.push(`${hex.slice(0, 4)}-${hex.slice(4, 8)}`);
    }
    return codes;
  }

  encryptSecret(plainSecret: string): string {
    const key = Buffer.from(this.encryptionKey, 'hex');
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plainSecret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decryptSecret(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    if (!ivHex || !authTagHex || !encrypted) throw new Error('Invalid encrypted data format');
    const key = Buffer.from(this.encryptionKey, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
