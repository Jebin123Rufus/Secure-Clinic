"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreakGlassUnauthorizedException = void 0;
const common_1 = require("@nestjs/common");
class BreakGlassUnauthorizedException extends common_1.HttpException {
    constructor(message) {
        super({
            statusCode: common_1.HttpStatus.FORBIDDEN,
            error: 'BreakGlassUnauthorized',
            message: `Emergency Break-Glass protocol rejected: ${message}`,
            auditAlert: 'CRITICAL_SECURITY_ALERT: Unauthorized emergency override attempt recorded in immutable audit log.',
        }, common_1.HttpStatus.FORBIDDEN);
    }
}
exports.BreakGlassUnauthorizedException = BreakGlassUnauthorizedException;
//# sourceMappingURL=break-glass-unauthorized.exception.js.map