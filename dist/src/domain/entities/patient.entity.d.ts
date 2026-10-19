export interface PatientProperties {
    id: string;
    clinicId: string;
    encryptedName: string;
    encryptedNationalId: string;
    encryptedContact: string;
    medicalNotes?: string | null;
    diagnosisCode?: string | null;
    consentWithdrawn: boolean;
    recordHash: string;
    isAnonymized: boolean;
    anonymizedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface DecryptedPatientData {
    id: string;
    clinicId: string;
    name: string;
    nationalId: string;
    contactNumber: string;
    medicalNotes?: string | null;
    diagnosisCode?: string | null;
    consentWithdrawn: boolean;
    recordHash: string;
    isAnonymized: boolean;
    anonymizedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare class PatientEntity {
    private readonly _id;
    private readonly _clinicId;
    private _encryptedName;
    private _encryptedNationalId;
    private _encryptedContact;
    private _medicalNotes;
    private _diagnosisCode;
    private _consentWithdrawn;
    private _recordHash;
    private _isAnonymized;
    private _anonymizedAt;
    private readonly _createdAt;
    private _updatedAt;
    constructor(props: PatientProperties);
    get id(): string;
    get clinicId(): string;
    get encryptedName(): string;
    get encryptedNationalId(): string;
    get encryptedContact(): string;
    get medicalNotes(): string | null;
    get diagnosisCode(): string | null;
    get consentWithdrawn(): boolean;
    get recordHash(): string;
    get isAnonymized(): boolean;
    get anonymizedAt(): Date | null;
    get createdAt(): Date;
    get updatedAt(): Date;
    isConsentValid(): boolean;
    updateDemographics(encryptedName: string, encryptedContact: string, newHash: string): void;
    updateMedicalData(medicalNotes: string | null, diagnosisCode: string | null, newHash: string): void;
    setConsentStatus(withdrawn: boolean): void;
    executeCryptographicPurge(): void;
    toPersistence(): PatientProperties;
    static fromRow(row: any): PatientEntity;
}
