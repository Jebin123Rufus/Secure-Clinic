import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateClinicDto {
  @IsString()
  @IsNotEmpty({ message: 'Clinic name is required.' })
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Clinic unique code is required.' })
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Clinic code must contain only uppercase alphanumeric characters, hyphens, or underscores (e.g. CLINIC_A).',
  })
  code!: string;
}
