export declare class CreatePatientDto {
    readonly name: string;
    readonly nationalId: string;
    readonly contactNumber: string;
    readonly medicalNotes?: string;
    readonly diagnosisCode?: string;
    readonly consentWithdrawn?: boolean;
}
