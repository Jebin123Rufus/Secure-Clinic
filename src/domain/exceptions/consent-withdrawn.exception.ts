import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when an operation is attempted on a patient record whose consent has been withdrawn.
 * Compliance: India DPDPA 2023 Sec 6 (Consent Verification) / GDPR Art. 7(3)
 */
export class ConsentWithdrawnException extends HttpException {
  constructor(patientId: string) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        error: 'ConsentWithdrawn',
        message: `CRUD operations are blocked: Patient [${patientId}] has actively withdrawn consent under DPDPA Sec 6 / GDPR Art 7.`,
        patientId,
        legalNotice: 'Under DPDPA 2023 Sec 6, data fiduciaries must cease processing personal data upon withdrawal of consent unless explicitly overridden by emergency medical protocols.',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
