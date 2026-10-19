import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface WormLogRecord {
  id: string;
  clinicId: string;
  userId: string;
  userRole: string;
  action: string;
  resourceId?: string | null;
  clientIp: string;
  statusCode: number;
  isBreakGlass: boolean;
  breakGlassReason?: string | null;
  timestamp: string;
  previousHash: string;
  hash: string;
  payloadSummary?: any;
}

/**
 * Immutable WORM (Write Once Read Many) Audit Vault Simulation
 *
 * Implements:
 * - SOC 2 Type II: WORM Audit Trail (Immutable, non-rewritable storage simulation e.g. AWS S3 Object Lock)
 * - HIPAA § 164.312(b): Audit Controls (Permanent, tamper-evident forensic trail)
 * - OWASP Top 10 (A09:2021 - Security Logging & Monitoring Failures)
 *
 * Utilizes cryptographic SHA-256 blockchain-style hash chaining. Every audit event
 * incorporates the digest of the preceding event, rendering retroactive modification
 * cryptographically impossible without invalidating the entire chain.
 */
@Injectable()
export class WormAuditService implements OnModuleInit {
  private readonly logger = new Logger(WormAuditService.name);
  private storageDirectory!: string;
  private vaultFilePath!: string;
  private latestHash: string = '0000000000000000000000000000000000000000000000000000000000000000';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const defaultPath = path.join(process.cwd(), 'storage', 'worm_audit_vault');
    this.storageDirectory = this.configService.get<string>(
      'WORM_STORAGE_PATH',
      defaultPath,
    );
    this.vaultFilePath = path.join(this.storageDirectory, 'worm_audit_chain.jsonl');

    if (!fs.existsSync(this.storageDirectory)) {
      fs.mkdirSync(this.storageDirectory, { recursive: true });
    }

    this.recoverLatestHash();
    this.logger.log(`WORM Audit Vault initialized. Path: ${this.vaultFilePath}`);
  }

  private writeQueue: Promise<void> = Promise.resolve();

  /**
   * Commits an audit record into the immutable WORM vault with cryptographic chaining.
   * Serialized via Promise queue to guarantee strict sequential hash chaining under concurrency.
   */
  async streamToWorm(
    entry: Omit<WormLogRecord, 'previousHash' | 'hash'>,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.writeQueue = this.writeQueue
        .then(async () => {
          const previousHash = this.latestHash;

          // Deterministic payload serialization for canonical hashing
          const canonicalPayload = JSON.stringify({
            id: entry.id,
            clinicId: entry.clinicId,
            userId: entry.userId,
            userRole: entry.userRole,
            action: entry.action,
            resourceId: entry.resourceId,
            clientIp: entry.clientIp,
            statusCode: entry.statusCode,
            isBreakGlass: entry.isBreakGlass,
            breakGlassReason: entry.breakGlassReason,
            timestamp: entry.timestamp,
            previousHash,
          });

          const currentHash = crypto
            .createHash('sha256')
            .update(canonicalPayload, 'utf8')
            .digest('hex');

          const wormRecord: WormLogRecord = {
            ...entry,
            previousHash,
            hash: currentHash,
          };

          // Append-only write simulation (WORM storage paradigm)
          const line = JSON.stringify(wormRecord) + '\n';
          await fs.promises.appendFile(this.vaultFilePath, line, 'utf8');

          this.latestHash = currentHash;
          resolve(currentHash);
        })
        .catch((err) => {
          this.logger.error(`WORM write failed: ${err.message}`);
          reject(err);
        });
    });
  }

  /**
   * Validates the integrity of the WORM audit vault.
   * Traverses all entries to ensure no records have been altered, injected, or truncated.
   */
  async verifyVaultIntegrity(): Promise<{ valid: boolean; totalRecords: number }> {
    if (!fs.existsSync(this.vaultFilePath)) {
      return { valid: true, totalRecords: 0 };
    }

    const lines = (await fs.promises.readFile(this.vaultFilePath, 'utf8'))
      .trim()
      .split('\n')
      .filter((l) => l.length > 0);

    let rollingHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < lines.length; i++) {
      const record: WormLogRecord = JSON.parse(lines[i]);

      if (record.previousHash !== rollingHash) {
        this.logger.error(
          `WORM Integrity Compromised at record index ${i}! Expected previous hash: ${rollingHash}, got: ${record.previousHash}`,
        );
        return { valid: false, totalRecords: i };
      }

      const canonicalPayload = JSON.stringify({
        id: record.id,
        clinicId: record.clinicId,
        userId: record.userId,
        userRole: record.userRole,
        action: record.action,
        resourceId: record.resourceId,
        clientIp: record.clientIp,
        statusCode: record.statusCode,
        isBreakGlass: record.isBreakGlass,
        breakGlassReason: record.breakGlassReason,
        timestamp: record.timestamp,
        previousHash: record.previousHash,
      });

      const recalculated = crypto
        .createHash('sha256')
        .update(canonicalPayload, 'utf8')
        .digest('hex');

      if (recalculated !== record.hash) {
        this.logger.error(
          `WORM Record Tampering detected at record [${record.id}]. Digest mismatch.`,
        );
        return { valid: false, totalRecords: i };
      }

      rollingHash = record.hash;
    }

    return { valid: true, totalRecords: lines.length };
  }

  private recoverLatestHash(): void {
    if (!fs.existsSync(this.vaultFilePath)) return;

    try {
      const content = fs.readFileSync(this.vaultFilePath, 'utf8').trim();
      if (!content) return;

      const lines = content.split('\n').filter((l) => l.length > 0);
      if (lines.length > 0) {
        const lastRecord: WormLogRecord = JSON.parse(lines[lines.length - 1]);
        this.latestHash = lastRecord.hash;
      }
    } catch (e: any) {
      this.logger.error(`Failed to recover latest WORM hash: ${e.message}`);
    }
  }
}
