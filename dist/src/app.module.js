"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const crypto_module_1 = require("./infrastructure/crypto/crypto.module");
const database_module_1 = require("./infrastructure/database/database.module");
const worm_audit_service_1 = require("./infrastructure/worm/worm-audit.service");
const audit_service_1 = require("./application/services/audit.service");
const patient_service_1 = require("./application/services/patient.service");
const patient_controller_1 = require("./presentation/controllers/patient.controller");
const health_controller_1 = require("./presentation/controllers/health.controller");
const rls_context_middleware_1 = require("./infrastructure/database/rls-context.middleware");
const roles_guard_1 = require("./presentation/guards/roles.guard");
const audit_log_interceptor_1 = require("./presentation/interceptors/audit-log.interceptor");
let AppModule = class AppModule {
    configure(consumer) {
        consumer
            .apply(rls_context_middleware_1.RlsContextMiddleware)
            .forRoutes({ path: '*', method: common_1.RequestMethod.ALL });
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env', '.env.example'],
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            crypto_module_1.CryptoModule,
            database_module_1.DatabaseModule,
        ],
        controllers: [health_controller_1.HealthController, patient_controller_1.PatientController],
        providers: [
            worm_audit_service_1.WormAuditService,
            audit_service_1.AuditService,
            patient_service_1.PatientService,
            roles_guard_1.RolesGuard,
            audit_log_interceptor_1.AuditLogInterceptor,
        ],
        exports: [worm_audit_service_1.WormAuditService, audit_service_1.AuditService, patient_service_1.PatientService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map