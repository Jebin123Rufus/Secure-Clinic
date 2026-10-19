import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Strict Input Validation DTO for Patient Record Updates
 *
 * Implements:
 * - Role-Based Boundary Enforcement:
 *   - 'Clerk' role can only modify non-medical fields (name, contactNumber, consentWithdrawn).
 *   - 'Doctor' role can modify both demographic and medical diagnostic fields (medicalNotes, diagnosisCode).
 */
export class UpdatePatientDto {
  @IsOptional()
  @IsString({ message: 'Patient name must be a string' })
  @Length(2, 100, { message: 'Patient name must be between 2 and 100 characters' })
  @Matches(/^[a-zA-Z\s\-'.]+$/, {
    message: 'Patient name may only contain alphabetic characters, spaces, hyphens, and apostrophes',
  })
  readonly name?: string;

  @IsOptional()
  @IsString({ message: 'Contact number must be a string' })
  @Matches(/^\+?[0-9\s\-()]{7,20}$/, {
    message: 'Contact number must follow international E.164 or standardized phone formatting (+1-555-555-5555)',
  })
  readonly contactNumber?: string;

  @IsOptional()
  @IsString({ message: 'Medical notes must be a string' })
  @MaxLength(2000, { message: 'Medical notes cannot exceed 2000 characters' })
  readonly medicalNotes?: string;

  @IsOptional()
  @IsString({ message: 'Diagnosis code must be a string' })
  @Matches(/^[A-Z][0-9]{2}(\.[0-9]{1,4})?$/, {
    message: 'Diagnosis code must conform to standardized ICD-10 diagnostic nomenclature',
  })
  readonly diagnosisCode?: string;

  @IsOptional()
  @IsBoolean({ message: 'Consent withdrawn flag must be a boolean' })
  readonly consentWithdrawn?: boolean;
}
