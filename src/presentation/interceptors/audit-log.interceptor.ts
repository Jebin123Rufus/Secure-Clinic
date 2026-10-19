import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { AuditService } from '../../application/services/audit.service';
import { SecurityContext } from '../../infrastructure/database/database.service';

/**
 * Enterprise Audit Logging Interceptor
 *
 * Implements:
 * - HIPAA § 164.312(b): Audit Controls (Mandatory logging of User ID, Action, Timestamp, Resource ID, Client IP)
 * - SOC 2 Type II: WORM Audit Trail Streaming (Real-time formatting and ingestion into immutable store)
 * - OWASP Top 10 (A09:2021 - Security Logging & Monitoring Failures): Automatic capture of both success and failure states
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const securityContext: SecurityContext | undefined = (request as any).securityContext;
    const clinicId = securityContext?.clinicId || (request.headers['x-clinic-id'] as string) || 'UNKNOWN_CLINIC';
    const userId = securityContext?.userId || (request.headers['x-user-id'] as string) || 'ANONYMOUS';
    const userRole = securityContext?.userRole || (request.headers['x-user-role'] as string) || 'UNKNOWN_ROLE';
    const isBreakGlass = securityContext?.isBreakGlass ?? (request.headers['x-break-glass'] === 'true');
    const breakGlassReason = securityContext?.breakGlassReason || (request.headers['x-break-glass-reason'] as string);
    const clientIp = request.ip || request.socket.remoteAddress || '127.0.0.1';

    const action = this.determineAuditAction(request);
    const resourceId = request.params?.id || null;

    // Sanitized request payload summary (HIPAA & GDPR: Strips direct raw identifiers from audit metadata)
    const sanitizedMetadata: Record<string, any> = {
      method: request.method,
      url: request.originalUrl || request.url,
      params: request.params,
      query: request.query,
      hasPayload: !!request.body && Object.keys(request.body).length > 0,
      breakGlassActivated: isBreakGlass,
    };

    return next.handle().pipe(
      tap(async (responseData) => {
        const executionTimeMs = Date.now() - startTime;
        const statusCode = response.statusCode || 200;
        const effectiveResourceId = resourceId || responseData?.id || null;

        try {
          await this.auditService.recordAudit({
            clinicId,
            userId,
            userRole,
            action,
            resourceId: effectiveResourceId,
            clientIp,
            statusCode,
            isBreakGlass,
            breakGlassReason: isBreakGlass ? breakGlassReason : null,
            details: {
              ...sanitizedMetadata,
              executionTimeMs,
              success: true,
            },
          });
        } catch (auditErr: any) {
          this.logger.error(
            `Failed to commit audit trail record: ${auditErr.message}`,
          );
        }
      }),
      catchError(async (error) => {
        const executionTimeMs = Date.now() - startTime;
        const statusCode = error.status || 500;

        try {
          await this.auditService.recordAudit({
            clinicId,
            userId,
            userRole,
            action: `${action}_FAILED`,
            resourceId,
            clientIp,
            statusCode,
            isBreakGlass,
            breakGlassReason: isBreakGlass ? breakGlassReason : null,
            details: {
              ...sanitizedMetadata,
              executionTimeMs,
              errorMessage: error.message,
              errorName: error.name,
              success: false,
            },
          });
        } catch (auditErr: any) {
          this.logger.error(
            `Failed to commit failure audit trail record: ${auditErr.message}`,
          );
        }

        throw error;
      }),
    );
  }

  private determineAuditAction(request: Request): string {
    const path = request.path || request.url;
    const method = request.method.toUpperCase();

    if (path.includes('/break-glass')) return 'HIPAA_BREAK_GLASS_ACCESS';
    if (path.includes('/export')) return 'GDPR_RIGHT_OF_ACCESS_EXPORT';
    if (path.includes('/erase')) return 'GDPR_RIGHT_TO_ERASURE_PURGE';

    switch (method) {
      case 'POST':
        return 'PATIENT_CREATE';
      case 'GET':
        return request.params?.id ? 'PATIENT_READ_ONE' : 'PATIENT_READ_ALL';
      case 'PUT':
      case 'PATCH':
        return 'PATIENT_UPDATE';
      case 'DELETE':
        return 'PATIENT_DELETE';
      default:
        return `HTTP_${method}`;
    }
  }
}
