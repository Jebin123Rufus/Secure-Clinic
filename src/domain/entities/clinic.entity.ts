export interface ClinicProperties {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ClinicEntity {
  constructor(private readonly props: ClinicProperties) {}

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get code(): string {
    return this.props.code;
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

  static fromRow(row: any): ClinicEntity {
    return new ClinicEntity({
      id: row.id,
      name: row.name,
      code: row.code,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
