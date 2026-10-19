import { DatabaseService } from '../../infrastructure/database/database.service';
import { WormAuditService } from '../../infrastructure/worm/worm-audit.service';
import { AuditLogEntity } from '../../domain/entities/audit-log.entity';
export declare class AuditService {
    private readonly databaseService;
    private readonly wormAuditService;
    private readonly logger;
    constructor(databaseService: DatabaseService, wormAuditService: WormAuditService);
    recordAudit(event: {
        clinicId: string;
        userId: string;
        userRole: string;
        action: string;
        resourceId?: string | null;
        clientIp: string;
        statusCode: number;
        isBreakGlass: boolean;
        breakGlassReason?: string | null;
        details?: Record<string, any>;
    }): Promise<AuditLogEntity>;
    getAuditLogs(clinicId: string): Promise<AuditLogEntity[]>;
}
