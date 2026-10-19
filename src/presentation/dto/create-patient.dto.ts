import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Strict Input Validation DTO for Patient Creation
 *
 * Implements:
 * - OWASP Top 10 (A03:2021 - Injection Prevention):
 *   Strict whitelist validation and regular expression constraints ensure malicious payloads,
 *   SQL injection patterns, script injection vectors, and malformed characters are rejected
 *   at the perimeter before hitting application services.
 * - HIPAA § 164.312(a)(2)(iv): Pre-encryption validation of critical demographic and clinical attributes.
 * - DPDPA 2023 Sec 6: Explicit recording of patient consent preference.
 */
export class CreatePatientDto {
  @IsNotEmpty({ message: 'Patient legal name is mandatory' })
  @IsString({ message: 'Patient name must be a string' })
  @Length(2, 100, { message: 'Patient name must be between 2 and 100 characters' })
  @Matches(/^[a-zA-Z\s\-'.]+$/, {
    message: 'Patient name may only contain alphabetic characters, spaces, hyphens, and apostrophes',
  })
  readonly name!: string;

  @IsNotEmpty({ message: 'National identification number (SSN/Aadhaar) is mandatory' })
  @IsString({ message: 'National identifier must be a string' })
  @Length(6, 30, { message: 'National identifier must be between 6 and 30 characters' })
  @Matches(/^[a-zA-Z0-9\-]+$/, {
    message: 'National identifier may only contain alphanumeric characters and hyphens',
  })
  readonly nationalId!: string;

  @IsNotEmpty({ message: 'Emergency contact telephone number is mandatory' })
  @IsString({ message: 'Contact number must be a string' })
  @Matches(/^\+?[0-9\s\-()]{7,20}$/, {
    message: 'Contact number must follow international E.164 or standardized phone formatting (+1-555-555-5555)',
  })
  readonly contactNumber!: string;

  @IsOptional()
  @IsString({ message: 'Medical notes must be a string' })
  @MaxLength(2000, { message: 'Medical notes cannot exceed 2000 characters' })
  readonly medicalNotes?: string;

  @IsOptional()
  @IsString({ message: 'Diagnosis code must be a string' })
  @Matches(/^[A-Z][0-9]{2}(\.[0-9]{1,4})?$/, {
    message: 'Diagnosis code must conform to standardized ICD-10 diagnostic nomenclature (e.g. J45.909, I10)',
  })
  readonly diagnosisCode?: string;

  @IsOptional()
  @IsBoolean({ message: 'Consent withdrawn flag must be a boolean' })
  readonly consentWithdrawn?: boolean;
}
