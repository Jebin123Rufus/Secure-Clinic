"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const database_service_1 = require("../../infrastructure/database/database.service");
const worm_audit_service_1 = require("../../infrastructure/worm/worm-audit.service");
const audit_log_entity_1 = require("../../domain/entities/audit-log.entity");
let AuditService = AuditService_1 = class AuditService {
    constructor(databaseService, wormAuditService) {
        this.databaseService = databaseService;
        this.wormAuditService = wormAuditService;
        this.logger = new common_1.Logger(AuditService_1.name);
    }
    async recordAudit(event) {
        const logId = (0, uuid_1.v4)();
        const timestampStr = new Date().toISOString();
        const wormHash = await this.wormAuditService.streamToWorm({
            id: logId,
            clinicId: event.clinicId,
            userId: event.userId,
            userRole: event.userRole,
            action: event.action,
            resourceId: event.resourceId,
            clientIp: event.clientIp,
            statusCode: event.statusCode,
            isBreakGlass: event.isBreakGlass,
            breakGlassReason: event.breakGlassReason,
            timestamp: timestampStr,
            payloadSummary: event.details,
        });
        const query = `
      INSERT INTO audit_logs (
        id, clinic_id, user_id, user_role, action, resource_id,
        client_ip, status_code, is_break_glass, break_glass_reason,
        worm_archive_hash, details, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;
        const params = [
            logId,
            event.clinicId,
            event.userId,
            event.userRole,
            event.action,
            event.resourceId || null,
            event.clientIp,
            event.statusCode,
            event.isBreakGlass,
            event.breakGlassReason || null,
            wormHash,
            event.details ? JSON.stringify(event.details) : null,
            timestampStr,
        ];
        try {
            const result = await this.databaseService.executeScopedQuery(query, params, {
                clinicId: event.clinicId,
                userId: event.userId,
                userRole: event.userRole,
                isBreakGlass: event.isBreakGlass,
                breakGlassReason: event.breakGlassReason || undefined,
            });
            const savedRow = result.rows[0];
            return audit_log_entity_1.AuditLogEntity.fromRow(savedRow);
        }
        catch (error) {
            this.logger.error(`Failed to persist audit log to database: ${error.message}. (WORM copy secured: ${wormHash})`);
            throw error;
        }
    }
    async getAuditLogs(clinicId) {
        const query = `
      SELECT * FROM audit_logs 
      ORDER BY timestamp DESC 
      LIMIT 100;
    `;
        const result = await this.databaseService.executeScopedQuery(query, []);
        return result.rows.map((row) => audit_log_entity_1.AuditLogEntity.fromRow(row));
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        worm_audit_service_1.WormAuditService])
], AuditService);
//# sourceMappingURL=audit.service.js.map