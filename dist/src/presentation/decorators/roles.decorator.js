"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllowBreakGlass = exports.ALLOW_BREAK_GLASS_KEY = exports.Roles = exports.ROLES_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.ROLES_KEY = 'roles';
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
exports.ALLOW_BREAK_GLASS_KEY = 'allowBreakGlass';
const AllowBreakGlass = (allow = true) => (0, common_1.SetMetadata)(exports.ALLOW_BREAK_GLASS_KEY, allow);
exports.AllowBreakGlass = AllowBreakGlass;
//# sourceMappingURL=roles.decorator.js.map