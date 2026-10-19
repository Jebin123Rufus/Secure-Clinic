import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when cryptographic checksum validation fails, indicating database tampering or integrity failure.
 * Compliance: HIPAA § 164.312(c)(2) (Mechanism to Authenticate PHI) / OWASP A08:2021 (Software and Data Integrity Failures)
 */
export class TamperDetectedException extends HttpException {
  constructor(patientId: string, claimedHash: string, calculatedHash: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'DataIntegrityFailure',
        message: `Cryptographic tamper detected for Patient [${patientId}]. Record hash verification failed.`,
        patientId,
        securityViolation: 'SHA-256 integrity hash does not match computed payload digest. Potential unauthorized database modification.',
        claimedHash,
        calculatedHash,
      },
      HttpStatus.CONFLICT,
    );
  }
}
