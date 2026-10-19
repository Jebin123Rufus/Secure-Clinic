import { DatabaseService } from '../../infrastructure/database/database.service';
import { WormAuditService } from '../../infrastructure/worm/worm-audit.service';
export declare class HealthController {
    private readonly databaseService;
    private readonly wormAuditService;
    constructor(databaseService: DatabaseService, wormAuditService: WormAuditService);
    check(): Promise<{
        status: string;
        timestamp: string;
        uptimeSeconds: number;
        compliance: {
            hipaa: string;
            soc2TypeII: string;
            gdpr: string;
            dpdpa: string;
            owaspTop10: string;
        };
        checks: {
            database: {
                status: string;
                rowLevelSecurity: string;
            };
            wormAuditStorage: {
                status: string;
                totalImmutableRecords: number;
            };
        };
    }>;
}
