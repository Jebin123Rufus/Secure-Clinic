import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { AsyncLocalStorage } from 'async_hooks';
export interface SecurityContext {
    clinicId: string;
    userId: string;
    userRole: 'Doctor' | 'Clerk' | 'Admin';
    isBreakGlass: boolean;
    breakGlassReason?: string;
    clientIp?: string;
}
export declare class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private pool;
    private isConnected;
    readonly asyncLocalStorage: AsyncLocalStorage<SecurityContext>;
    private inMemoryPatients;
    private inMemoryAuditLogs;
    private inMemoryClinics;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    isDbConnected(): boolean;
    executeScopedQuery<R extends QueryResultRow = any>(queryText: string, params?: any[], contextOverride?: SecurityContext): Promise<QueryResult<R>>;
    setRlsContextOnClient(client: PoolClient, context: SecurityContext): Promise<void>;
    private seedDefaultClinics;
    private executeSimulatedQuery;
}
