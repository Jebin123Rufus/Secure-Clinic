"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogEntity = void 0;
class AuditLogEntity {
    constructor(props) {
        this.props = props;
    }
    static fromRow(row) {
        return new AuditLogEntity({
            id: row.id,
            clinicId: row.clinic_id,
            userId: row.user_id,
            userRole: row.user_role,
            action: row.action,
            resourceId: row.resource_id,
            clientIp: row.client_ip,
            statusCode: row.status_code,
            isBreakGlass: row.is_break_glass,
            breakGlassReason: row.break_glass_reason,
            wormArchiveHash: row.worm_archive_hash,
            details: row.details,
            timestamp: new Date(row.timestamp),
        });
    }
}
exports.AuditLogEntity = AuditLogEntity;
//# sourceMappingURL=audit-log.entity.js.map