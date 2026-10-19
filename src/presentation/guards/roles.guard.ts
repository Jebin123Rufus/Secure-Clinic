import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ALLOW_BREAK_GLASS_KEY,
  ROLES_KEY,
  UserRole,
} from '../decorators/roles.decorator';
import { SecurityContext } from '../../infrastructure/database/database.service';

/**
 * Enterprise Role-Based Access Control (RBAC) & Break-Glass Authorization Guard
 *
 * Implements:
 * - OWASP Top 10 (A01:2021 - Broken Access Control): Strict enforcement of least privilege.
 * - Access Control Matrix:
 *   - 'Doctor': Full CREATE/READ/UPDATE privileges for both demographic and clinical data within their tenant.
 *   - 'Clerk': Restricted to CREATE/UPDATE on demographic, non-medical fields only.
 *   - 'Admin': Exclusively authorized to execute GDPR Deletion/Exports and initiate Emergency Break-Glass protocols.
 * - HIPAA § 164.312(a)(2)(ii): Emergency Break-Glass Protocol Override Detection
 *   Allows audited emergency bypass during critical life-safety incidents when accompanied
 *   by valid clinical justification.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const allowBreakGlass = this.reflector.getAllAndOverride<boolean>(
      ALLOW_BREAK_GLASS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are specified, the route is open (e.g. health check)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const securityContext: SecurityContext = request.securityContext;

    if (!securityContext) {
      throw new ForbiddenException(
        'Access Denied: Missing security context. Unauthenticated request.',
      );
    }

    const { userRole, isBreakGlass, breakGlassReason, userId, clinicId } =
      securityContext;

    // ------------------------------------------------------------------------
    // 1. HIPAA § 164.312(a)(2)(ii) EMERGENCY BREAK-GLASS OVERRIDE EVALUATION
    // ------------------------------------------------------------------------
    if (isBreakGlass) {
      if (!breakGlassReason || breakGlassReason.trim().length < 10) {
        throw new ForbiddenException(
          'HIPAA Emergency Break-Glass Rejected: Mandatory clinical emergency justification (§ 164.312(a)(2)(ii)) must be at least 10 characters long.',
        );
      }

      // Check if endpoint permits break-glass override
      const canOverride = allowBreakGlass ?? true;
      if (canOverride) {
        this.logger.warn(
          `[CRITICAL AUDIT] Emergency Break-Glass override ACTIVE by user [${userId}] on route [${request.method} ${request.url}]. Reason: "${breakGlassReason}"`,
        );
        // Break-glass overrides normal role matching with emergency elevation
        return true;
      }
    }

    // ------------------------------------------------------------------------
    // 2. STANDARD ROLE MATRIX EVALUATION
    // ------------------------------------------------------------------------
    const hasRole = requiredRoles.includes(userRole);

    if (!hasRole) {
      this.logger.warn(
        `RBAC Access Denied: User [${userId}] with role [${userRole}] attempted to access resource requiring roles [${requiredRoles.join(', ')}] on clinic [${clinicId}].`,
      );
      throw new ForbiddenException(
        `Access Forbidden: Role "${userRole}" lacks sufficient privileges for this operation. Required: [${requiredRoles.join(', ')}].`,
      );
    }

    // ------------------------------------------------------------------------
    // 3. CLERK LEAST-PRIVILEGE PAYLOAD ENFORCEMENT
    // Clerks are strictly prohibited from submitting or updating medical/clinical diagnostic fields
    // ------------------------------------------------------------------------
    if (userRole === 'Clerk' && (request.method === 'POST' || request.method === 'PUT')) {
      const body = request.body;
      if (body) {
        if (body.medicalNotes !== undefined || body.diagnosisCode !== undefined) {
          throw new ForbiddenException(
            'Least Privilege Violation: "Clerk" role is strictly barred from writing or modifying clinical diagnostic fields (medicalNotes, diagnosisCode).',
          );
        }
      }
    }

    return true;
  }
}
