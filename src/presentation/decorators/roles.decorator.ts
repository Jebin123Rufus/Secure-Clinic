import { SetMetadata } from '@nestjs/common';

export type UserRole = 'Doctor' | 'Clerk' | 'Admin';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const ALLOW_BREAK_GLASS_KEY = 'allowBreakGlass';
export const AllowBreakGlass = (allow: boolean = true) =>
  SetMetadata(ALLOW_BREAK_GLASS_KEY, allow);
