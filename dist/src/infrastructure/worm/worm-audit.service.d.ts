import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
export declare class WormAuditService implements OnModuleInit {
    private readonly configService;
    private readonly logger;
    private storageDirectory;
    private vaultFilePath;
    private latestHash;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    private writeQueue;
    streamToWorm(entry: Omit<WormLogRecord, 'previousHash' | 'hash'>): Promise<string>;
    verifyVaultIntegrity(): Promise<{
        valid: boolean;
        totalRecords: number;
    }>;
    private recoverLatestHash;
}
