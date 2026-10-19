import {
  BadRequestException,
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DatabaseService, SecurityContext } from './database.service';

export interface RequestWithSecurityContext extends Request {
  securityContext: SecurityContext;
}

/**
 * Enterprise PostgreSQL Row-Level Security (RLS) Context Middleware
 *
 * Implements:
 * - SOC 2 Type II: Data Ingress/Egress Guardrails
 * - HIPAA § 164.312(a)(2)(i): Unique User Identification
 * - HIPAA § 164.312(a)(2)(ii): Emergency Break-Glass Context Extraction
 * - OWASP Top 10 (A01: Broken Access Control)
 *
 * Intercepts incoming request headers:
 * - `x-clinic-id`: Tenant Clinic UUID (e.g. Clinic A or Clinic B)
 * - `x-user-role`: Role identity ('Doctor' | 'Clerk' | 'Admin')
 * - `x-user-id`: Unique Clinician Identifier
 * - `x-break-glass`: Optional emergency override trigger ('true')
 * - `x-break-glass-reason`: Required emergency justification string
 *
 * Establishes the PostgreSQL `SET LOCAL app.current_clinic_id` transaction scope
 * before any database operations are executed.
 */
@Injectable()
export class RlsContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RlsContextMiddleware.name);

  constructor(private readonly databaseService: DatabaseService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Whitelist public/health endpoints from mandatory tenant context requirements
    if (req.path === '/health' || req.path === '/' || req.path === '/favicon.ico') {
      return next();
    }

    const rawClinicId = req.headers['x-clinic-id'] as string;
    const rawUserRole = req.headers['x-user-role'] as string;
    const rawUserId = req.headers['x-user-id'] as string;
    const rawBreakGlass = req.headers['x-break-glass'] as string;
    const rawBreakGlassReason = req.headers['x-break-glass-reason'] as string;

    // Validate presence of essential multi-tenant and identity headers (HIPAA & SOC 2)
    if (!rawClinicId) {
      throw new BadRequestException(
        'Missing required security header: "x-clinic-id". Tenant identification is mandatory.',
      );
    }

    if (!rawUserRole) {
      throw new BadRequestException(
        'Missing required security header: "x-user-role". Role-based demarcation is mandatory.',
      );
    }

    if (!rawUserId) {
      throw new BadRequestException(
        'Missing required security header: "x-user-id". HIPAA § 164.312(a)(2)(i) prohibits unauthenticated access.',
      );
    }

    const validRoles = ['Doctor', 'Clerk', 'Admin'];
    if (!validRoles.includes(rawUserRole)) {
      throw new BadRequestException(
        `Invalid user role "${rawUserRole}". Permitted roles are: ${validRoles.join(', ')}.`,
      );
    }

    const isBreakGlass = rawBreakGlass === 'true';

    // Build the immutable security context for this transaction
    const securityContext: SecurityContext = {
      clinicId: rawClinicId.trim(),
      userRole: rawUserRole as 'Doctor' | 'Clerk' | 'Admin',
      userId: rawUserId.trim(),
      isBreakGlass,
      breakGlassReason: rawBreakGlassReason ? rawBreakGlassReason.trim() : undefined,
      clientIp: req.ip || req.socket.remoteAddress || '127.0.0.1',
    };

    // Attach security context directly to the Express Request
    (req as any).securityContext = securityContext;

    // Log tenant scoping for SOC 2 monitoring
    this.logger.debug(
      `[RLS Scope Bound] Clinic: ${securityContext.clinicId} | User: ${securityContext.userId} (${securityContext.userRole}) | Break-Glass: ${securityContext.isBreakGlass}`,
    );

    // Bind security context to AsyncLocalStorage, ensuring all asynchronous database
    // transactions run within the SET LOCAL app.current_clinic_id transaction scope
    this.databaseService.asyncLocalStorage.run(securityContext, () => {
      next();
    });
  }
}
