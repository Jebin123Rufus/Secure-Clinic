export interface UserProperties {
  id: string;
  clinicId: string | null;
  email: string;
  passwordHash: string;
  name: string;
  role: 'Doctor' | 'Clerk' | 'Admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeUserDto {
  id: string;
  clinicId: string | null;
  email: string;
  name: string;
  role: 'Doctor' | 'Clerk' | 'Admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserEntity {
  constructor(private readonly props: UserProperties) {}

  get id(): string {
    return this.props.id;
  }

  get clinicId(): string | null {
    return this.props.clinicId;
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get name(): string {
    return this.props.name;
  }

  get role(): 'Doctor' | 'Clerk' | 'Admin' {
    return this.props.role;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Sanitizes user representation: sensitive information (password hash) is NEVER exposed.
   */
  toSafeUser(): SafeUserDto {
    return {
      id: this.props.id,
      clinicId: this.props.clinicId,
      email: this.props.email,
      name: this.props.name,
      role: this.props.role,
      isActive: this.props.isActive,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }

  static fromRow(row: any): UserEntity {
    return new UserEntity({
      id: row.id,
      clinicId: row.clinic_id,
      email: row.email,
      passwordHash: row.password_hash,
      name: row.name,
      role: row.role,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
