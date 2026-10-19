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
var RlsContextMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RlsContextMiddleware = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("./database.service");
let RlsContextMiddleware = RlsContextMiddleware_1 = class RlsContextMiddleware {
    constructor(databaseService) {
        this.databaseService = databaseService;
        this.logger = new common_1.Logger(RlsContextMiddleware_1.name);
    }
    use(req, res, next) {
        if (req.path === '/health' || req.path === '/' || req.path === '/favicon.ico') {
            return next();
        }
        const rawClinicId = req.headers['x-clinic-id'];
        const rawUserRole = req.headers['x-user-role'];
        const rawUserId = req.headers['x-user-id'];
        const rawBreakGlass = req.headers['x-break-glass'];
        const rawBreakGlassReason = req.headers['x-break-glass-reason'];
        if (!rawClinicId) {
            throw new common_1.BadRequestException('Missing required security header: "x-clinic-id". Tenant identification is mandatory.');
        }
        if (!rawUserRole) {
            throw new common_1.BadRequestException('Missing required security header: "x-user-role". Role-based demarcation is mandatory.');
        }
        if (!rawUserId) {
            throw new common_1.BadRequestException('Missing required security header: "x-user-id". HIPAA § 164.312(a)(2)(i) prohibits unauthenticated access.');
        }
        const validRoles = ['Doctor', 'Clerk', 'Admin'];
        if (!validRoles.includes(rawUserRole)) {
            throw new common_1.BadRequestException(`Invalid user role "${rawUserRole}". Permitted roles are: ${validRoles.join(', ')}.`);
        }
        const isBreakGlass = rawBreakGlass === 'true';
        const securityContext = {
            clinicId: rawClinicId.trim(),
            userRole: rawUserRole,
            userId: rawUserId.trim(),
            isBreakGlass,
            breakGlassReason: rawBreakGlassReason ? rawBreakGlassReason.trim() : undefined,
            clientIp: req.ip || req.socket.remoteAddress || '127.0.0.1',
        };
        req.securityContext = securityContext;
        this.logger.debug(`[RLS Scope Bound] Clinic: ${securityContext.clinicId} | User: ${securityContext.userId} (${securityContext.userRole}) | Break-Glass: ${securityContext.isBreakGlass}`);
        this.databaseService.asyncLocalStorage.run(securityContext, () => {
            next();
        });
    }
};
exports.RlsContextMiddleware = RlsContextMiddleware;
exports.RlsContextMiddleware = RlsContextMiddleware = RlsContextMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], RlsContextMiddleware);
//# sourceMappingURL=rls-context.middleware.js.map