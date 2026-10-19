export interface AuditLogProperties {
    id?: string;
    clinicId: string;
    userId: string;
    userRole: string;
    action: string;
    resourceId?: string | null;
    clientIp: string;
    statusCode: number;
    isBreakGlass: boolean;
    breakGlassReason?: string | null;
    wormArchiveHash: string;
    details?: Record<string, any> | null;
    timestamp?: Date;
}
export declare class AuditLogEntity {
    readonly props: AuditLogProperties;
    constructor(props: AuditLogProperties);
    static fromRow(row: any): AuditLogEntity;
}
