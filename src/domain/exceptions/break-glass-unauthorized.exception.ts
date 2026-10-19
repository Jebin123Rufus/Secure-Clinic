import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when an unauthorized or improperly justified Emergency Break-Glass procedure is attempted.
 * Compliance: HIPAA § 164.312(a)(2)(ii) (Emergency Access Procedure)
 */
export class BreakGlassUnauthorizedException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        error: 'BreakGlassUnauthorized',
        message: `Emergency Break-Glass protocol rejected: ${message}`,
        auditAlert: 'CRITICAL_SECURITY_ALERT: Unauthorized emergency override attempt recorded in immutable audit log.',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
