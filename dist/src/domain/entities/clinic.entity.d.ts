export interface ClinicProperties {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare class ClinicEntity {
    private readonly props;
    constructor(props: ClinicProperties);
    get id(): string;
    get name(): string;
    get code(): string;
    get isActive(): boolean;
    get createdAt(): Date;
    get updatedAt(): Date;
    static fromRow(row: any): ClinicEntity;
}
