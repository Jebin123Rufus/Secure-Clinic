export interface ClinicProperties {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ClinicEntity {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: ClinicProperties) {
    this.id = props.id;
    this.name = props.name;
    this.code = props.code;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
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
