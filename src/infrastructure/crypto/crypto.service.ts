import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Enterprise Cryptographic Service
 *
 * Implements:
 * - HIPAA § 164.312(a)(2)(iv): Cryptographic column-level encryption at rest (AES-256-GCM)
 * - HIPAA § 164.312(c)(2): Mechanism to authenticate PHI via cryptographic SHA-256 hashing
 * - OWASP Top 10 (A02: Cryptographic Failures): Authenticated encryption avoiding MAC-then-encrypt pitfalls
 * - GDPR Art. 32 / DPDPA Sec 8: Pseudonymisation and isolation of direct identifiers
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 12; // 96-bit IV recommended by NIST SP 800-38D for AES-GCM
  private readonly tagLength = 16; // 128-bit authentication tag
  private readonly masterKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawKey = this.configService.get<string>(
      'DATA_ENCRYPTION_KEY',
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    );

    if (rawKey.length === 64) {
      this.masterKey = Buffer.from(rawKey, 'hex');
    } else if (rawKey.length === 32) {
      this.masterKey = Buffer.from(rawKey, 'utf-8');
    } else {
      this.logger.warn(
        'DATA_ENCRYPTION_KEY must be a 32-byte hex string (64 characters) or 32-byte UTF-8 string. Deriving fallback with SHA-256.',
      );
      this.masterKey = crypto.createHash('sha256').update(rawKey).digest();
    }
  }

  /**
   * Encrypts plaintext using AES-256-GCM authenticated encryption.
   * Produces a string in the format: "iv:authTag:ciphertext" (all Base64 encoded).
   *
   * @param plaintext Sensitive PHI string (e.g. Patient Name, SSN, Contact Number)
   * @returns Serialized encrypted payload containing IV, Auth Tag, and Ciphertext
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      return '';
    }

    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv, {
      authTagLength: this.tagLength,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  /**
   * Decrypts an AES-256-GCM ciphertext payload and validates the authentication tag.
   *
   * @param encryptedPayload Formatted string "iv:authTag:ciphertext"
   * @returns Decrypted plaintext string
   * @throws Error if ciphertext has been tampered with or tag verification fails
   */
  decrypt(encryptedPayload: string): string {
    if (!encryptedPayload) {
      return '';
    }

    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
      throw new Error(
        'Invalid encrypted payload format. Expected "iv:authTag:ciphertext".',
      );
    }

    const [ivB64, tagB64, ciphertextB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    if (iv.length !== this.ivLength || authTag.length !== this.tagLength) {
      throw new Error('Malformed IV or Authentication Tag length in payload.');
    }

    const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv, {
      authTagLength: this.tagLength,
    });

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Computes a deterministic SHA-256 cryptographic digest to authenticate PHI integrity.
   * HIPAA § 164.312(c)(2) Mechanism to Authenticate PHI.
   *
   * @param components Ordered list or key-value object of immutable record properties
   * @returns 64-character hexadecimal SHA-256 digest
   */
  computeIntegrityHash(components: {
    clinicId: string;
    encryptedNationalId: string;
    diagnosisCode?: string;
    medicalNotes?: string;
  }): string {
    const canonicalString = [
      components.clinicId || '',
      components.encryptedNationalId || '',
      components.diagnosisCode || '',
      components.medicalNotes || '',
    ].join('|#|');

    return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
  }

  /**
   * Verifies whether the provided record data matches its claimed integrity hash.
   */
  verifyIntegrity(
    claimedHash: string,
    components: {
      clinicId: string;
      encryptedNationalId: string;
      diagnosisCode?: string;
      medicalNotes?: string;
    },
  ): boolean {
    const computed = this.computeIntegrityHash(components);
    return crypto.timingSafeEqual(
      Buffer.from(claimedHash, 'hex'),
      Buffer.from(computed, 'hex'),
    );
  }

  /**
   * Generates a cryptographic pseudorandom token for break-glass emergency sessions.
   */
  generateSecureToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }
}
