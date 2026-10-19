import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateClinicDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Clinic code must contain only uppercase alphanumeric characters, hyphens, or underscores (e.g. CLINIC_A).',
  })
  code?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
