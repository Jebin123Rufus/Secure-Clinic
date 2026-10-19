import { IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * DTO for Initiating or Authorizing HIPAA Emergency Break-Glass Access
 *
 * Compliance: HIPAA § 164.312(a)(2)(ii) (Emergency Access Procedure)
 * Requires formal clinical justification before activating elevated emergency access.
 */
export class BreakGlassDto {
  @IsNotEmpty({ message: 'Emergency medical justification is mandatory for Break-Glass bypass' })
  @IsString({ message: 'Emergency reason must be a string' })
  @Length(10, 500, {
    message: 'Break-glass reason must be a detailed description between 10 and 500 characters',
  })
  readonly reason!: string;

  @IsNotEmpty({ message: 'Attending physician or authorized incident commander ID is mandatory' })
  @IsString()
  readonly authorizedBy!: string;
}
