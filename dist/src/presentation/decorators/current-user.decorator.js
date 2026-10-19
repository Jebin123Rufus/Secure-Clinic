"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentSecurityContext = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentSecurityContext = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const securityContext = request.securityContext;
    if (!securityContext) {
        return null;
    }
    return data ? securityContext[data] : securityContext;
});
//# sourceMappingURL=current-user.decorator.js.map