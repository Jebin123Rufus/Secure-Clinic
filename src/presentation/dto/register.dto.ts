import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @MaxLength(100, { message: 'Password cannot exceed 100 characters.' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required.' })
  @MaxLength(255)
  name!: string;

  @IsIn(['Doctor', 'Clerk', 'Admin'], {
    message: 'Role must be one of: Doctor, Clerk, Admin',
  })
  @IsNotEmpty({ message: 'Role is mandatory' })
  role!: 'Doctor' | 'Clerk' | 'Admin';

  @IsString({ message: 'clinicId must be a valid UUID string' })
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, {
    message: 'clinicId must be a valid UUID format (8-4-4-4-12)',
  })
  @IsOptional()
  clinicId?: string;
}
