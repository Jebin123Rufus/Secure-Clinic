import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuditService } from '../../application/services/audit.service';
export declare class AuditLogInterceptor implements NestInterceptor {
    private readonly auditService;
    private readonly logger;
    constructor(auditService: AuditService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private determineAuditAction;
}
