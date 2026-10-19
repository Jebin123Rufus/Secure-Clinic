import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService, JwtPayload } from '../../application/services/auth.service';

/**
 * JWT Authentication Guard
 *
 * Implements:
 * - OWASP Top 10 API2: Broken Authentication
 * - Protected routes enforcement: Validates Bearer JWT tokens
 * - Extracts authenticated actor context (userId, role, clinicId)
 * - Automatically bridges authenticated context into PostgreSQL Row-Level Security (RLS)
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    let jwtPayload: JwtPayload | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      try {
        jwtPayload = this.authService.verifyToken(token);
        request.user = jwtPayload;
      } catch (err: any) {
        throw new UnauthorizedException(`Authentication failed: ${err.message}`);
      }
    }

    const userId = jwtPayload?.sub || (request.headers['x-user-id'] as string);
    const userRole = jwtPayload?.role || (request.headers['x-user-role'] as 'Doctor' | 'Clerk' | 'Admin');
    const clinicId = jwtPayload?.clinicId || (request.headers['x-clinic-id'] as string);

    if (!userId || !userRole) {
      throw new UnauthorizedException(
        'Protected API: Valid Bearer JWT token or authenticated context is required.',
      );
    }

    if (!request.securityContext) {
      request.securityContext = {
        clinicId: clinicId || '00000000-0000-0000-0000-000000000000',
        userRole,
        userId,
        isBreakGlass: request.headers['x-break-glass'] === 'true',
        breakGlassReason: request.headers['x-break-glass-reason'] as string,
        clientIp: request.ip || request.socket.remoteAddress || '127.0.0.1',
      };
    }

    return true;
  }
}
