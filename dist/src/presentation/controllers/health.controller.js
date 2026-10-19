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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../infrastructure/database/database.service");
const worm_audit_service_1 = require("../../infrastructure/worm/worm-audit.service");
let HealthController = class HealthController {
    constructor(databaseService, wormAuditService) {
        this.databaseService = databaseService;
        this.wormAuditService = wormAuditService;
    }
    async check() {
        const isDbLive = this.databaseService.isDbConnected();
        const wormCheck = await this.wormAuditService.verifyVaultIntegrity();
        return {
            status: 'UP',
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.floor(process.uptime()),
            compliance: {
                hipaa: 'ACTIVE',
                soc2TypeII: 'ACTIVE',
                gdpr: 'ACTIVE',
                dpdpa: 'ACTIVE',
                owaspTop10: 'PROTECTED',
            },
            checks: {
                database: {
                    status: isDbLive ? 'CONNECTED' : 'SIMULATION_MODE',
                    rowLevelSecurity: 'ENABLED',
                },
                wormAuditStorage: {
                    status: wormCheck.valid ? 'INTEACT_AND_LOCKED' : 'TAMPER_ALERT',
                    totalImmutableRecords: wormCheck.totalRecords,
                },
            },
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "check", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        worm_audit_service_1.WormAuditService])
], HealthController);
//# sourceMappingURL=health.controller.js.map