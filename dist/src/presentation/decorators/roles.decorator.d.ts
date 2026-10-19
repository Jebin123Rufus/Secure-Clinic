export type UserRole = 'Doctor' | 'Clerk' | 'Admin';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: UserRole[]) => import("@nestjs/common").CustomDecorator<string>;
export declare const ALLOW_BREAK_GLASS_KEY = "allowBreakGlass";
export declare const AllowBreakGlass: (allow?: boolean) => import("@nestjs/common").CustomDecorator<string>;
