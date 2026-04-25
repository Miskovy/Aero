import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class VaultService implements OnModuleInit {
  private readonly logger = new Logger(VaultService.name);
  private readonly algorithm = 'aes-256-gcm';
  private masterKey: Buffer;

  onModuleInit() {
    const rawKey = process.env.AERO_VAULT_KEY;
    if (!rawKey) {
      this.logger.error(
        'AERO_VAULT_KEY is missing from the environment. Vault is securely locked down. The application will not be able to decrypt secrets.',
      );
      throw new Error('AERO_VAULT_KEY is missing');
    } else {
      // Ensure it's exactly 32 bytes for AES-256
      if (rawKey.length < 32) {
        this.masterKey = Buffer.from(
          rawKey.padEnd(32, '0').slice(0, 32),
          'utf-8',
        );
      } else {
        this.masterKey = Buffer.from(rawKey.slice(0, 32), 'utf-8');
      }
    }
  }

  encrypt(plainText: string) {
    const iv = crypto.randomBytes(16); // 16 bytes for AES GCM
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encryptedValue: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  decrypt(
    encryptedValue: string,
    ivHex?: string | null,
    authTagHex?: string | null,
  ): string {
    if (!ivHex || !authTagHex) {
      // Fallback for legacy data that wasn't encrypted with GCM, or isn't encrypted at all
      return encryptedValue;
    }

    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.masterKey,
        iv,
      );

      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (e) {
      this.logger.error(
        'Failed to decrypt value. It may have been tampered with or the AERO_VAULT_KEY changed.',
      );
      throw e;
    }
  }
}
