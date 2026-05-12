import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class VaultService implements OnModuleInit {
  private readonly logger = new Logger(VaultService.name);
  private readonly algorithm = 'aes-256-gcm';

  private keys: Map<string, Buffer> = new Map();
  private currentVersion?: string;

  onModuleInit() {
    this.currentVersion = process.env.AERO_VAULT_CURRENT_VERSION;
    if (!this.currentVersion) {
      throw new Error(
        'AERO_VAULT_CURRENT_VERSION is missing from environment.',
      );
    }
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('AERO_VAULT_KEY_V') && value) {
        const version = key.replace('AERO_VAULT_KEY_V', '');

        // Decode the base64 key back into a 32-byte buffer
        const keyBuffer = Buffer.from(value, 'base64');

        if (keyBuffer.length !== 32) {
          throw new Error(`Key ${key} must be exactly 32 bytes when decoded.`);
        }

        this.keys.set(version, keyBuffer);
      }
    }

    if (!this.keys.has(this.currentVersion)) {
      throw new Error(
        `Current version ${this.currentVersion} has no matching key in environment.`,
      );
    }

    this.logger.log(
      `Vault initialized. Current encryption version: v${this.currentVersion}. Loaded ${this.keys.size} key(s).`,
    );
  }

  encrypt(plainText: string) {
    const iv = crypto.randomBytes(16);
    const currentKey = this.keys.get(this.currentVersion!)!;

    const cipher = crypto.createCipheriv(this.algorithm, currentKey, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encryptedValue: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      version: this.currentVersion,
    };
  }

  decrypt(
    encryptedValue: string,
    ivHex?: string | null,
    authTagHex?: string | null,
    version?: string | null,
  ): string {
    if (!ivHex || !authTagHex) return encryptedValue;

    // Default to version 1 if no version was saved (backwards compatibility)
    const keyVersion = version || '1';
    const keyToUse = this.keys.get(keyVersion);

    if (!keyToUse) {
      this.logger.error(
        `Cannot decrypt: Key version v${keyVersion} is missing from environment.`,
      );
      throw new Error('Missing decryption key version');
    }

    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, keyToUse, iv);

      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (e) {
      this.logger.error(
        'Failed to decrypt value. Tampering detected or wrong key.',
      );
      throw e;
    }
  }

  //TODO:

  // getDecrypted(serviceId: string): Promise<Record<string, string>> {
  //   // Placeholder: In a real implementation, this would fetch encrypted secrets from a database
  //   // and decrypt them using the decrypt method above.
  //   return Promise.resolve({
  //     EXAMPLE_SECRET: 'decrypted_value',
  //   });
  // }
}
