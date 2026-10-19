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
var AuditLogInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const audit_service_1 = require("../../application/services/audit.service");
let AuditLogInterceptor = AuditLogInterceptor_1 = class AuditLogInterceptor {
    constructor(auditService) {
        this.auditService = auditService;
        this.logger = new common_1.Logger(AuditLogInterceptor_1.name);
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const startTime = Date.now();
        const securityContext = request.securityContext;
        const clinicId = securityContext?.clinicId || request.headers['x-clinic-id'] || 'UNKNOWN_CLINIC';
        const userId = securityContext?.userId || request.headers['x-user-id'] || 'ANONYMOUS';
        const userRole = securityContext?.userRole || request.headers['x-user-role'] || 'UNKNOWN_ROLE';
        const isBreakGlass = securityContext?.isBreakGlass ?? (request.headers['x-break-glass'] === 'true');
        const breakGlassReason = securityContext?.breakGlassReason || request.headers['x-break-glass-reason'];
        const clientIp = request.ip || request.socket.remoteAddress || '127.0.0.1';
        const action = this.determineAuditAction(request);
        const resourceId = request.params?.id || null;
        const sanitizedMetadata = {
            method: request.method,
            url: request.originalUrl || request.url,
            params: request.params,
            query: request.query,
            hasPayload: !!request.body && Object.keys(request.body).length > 0,
            breakGlassActivated: isBreakGlass,
        };
        return next.handle().pipe((0, operators_1.tap)(async (responseData) => {
            const executionTimeMs = Date.now() - startTime;
            const statusCode = response.statusCode || 200;
            const effectiveResourceId = resourceId || responseData?.id || null;
            try {
                await this.auditService.recordAudit({
                    clinicId,
                    userId,
                    userRole,
                    action,
                    resourceId: effectiveResourceId,
                    clientIp,
                    statusCode,
                    isBreakGlass,
                    breakGlassReason: isBreakGlass ? breakGlassReason : null,
                    details: {
                        ...sanitizedMetadata,
                        executionTimeMs,
                        success: true,
                    },
                });
            }
            catch (auditErr) {
                this.logger.error(`Failed to commit audit trail record: ${auditErr.message}`);
            }
        }), (0, operators_1.catchError)(async (error) => {
            const executionTimeMs = Date.now() - startTime;
            const statusCode = error.status || 500;
            try {
                await this.auditService.recordAudit({
                    clinicId,
                    userId,
                    userRole,
                    action: `${action}_FAILED`,
                    resourceId,
                    clientIp,
                    statusCode,
                    isBreakGlass,
                    breakGlassReason: isBreakGlass ? breakGlassReason : null,
                    details: {
                        ...sanitizedMetadata,
                        executionTimeMs,
                        errorMessage: error.message,
                        errorName: error.name,
                        success: false,
                    },
                });
            }
            catch (auditErr) {
                this.logger.error(`Failed to commit failure audit trail record: ${auditErr.message}`);
            }
            throw error;
        }));
    }
    determineAuditAction(request) {
        const path = request.path || request.url;
        const method = request.method.toUpperCase();
        if (path.includes('/break-glass'))
            return 'HIPAA_BREAK_GLASS_ACCESS';
        if (path.includes('/export'))
            return 'GDPR_RIGHT_OF_ACCESS_EXPORT';
        if (path.includes('/erase'))
            return 'GDPR_RIGHT_TO_ERASURE_PURGE';
        switch (method) {
            case 'POST':
                return 'PATIENT_CREATE';
            case 'GET':
                return request.params?.id ? 'PATIENT_READ_ONE' : 'PATIENT_READ_ALL';
            case 'PUT':
            case 'PATCH':
                return 'PATIENT_UPDATE';
            case 'DELETE':
                return 'PATIENT_DELETE';
            default:
                return `HTTP_${method}`;
        }
    }
};
exports.AuditLogInterceptor = AuditLogInterceptor;
exports.AuditLogInterceptor = AuditLogInterceptor = AuditLogInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], AuditLogInterceptor);
//# sourceMappingURL=audit-log.interceptor.js.map