import { DatabaseService, SecurityContext } from '../../infrastructure/database/database.service';
import { CryptoService } from '../../infrastructure/crypto/crypto.service';
import { CreatePatientDto } from '../../presentation/dto/create-patient.dto';
import { UpdatePatientDto } from '../../presentation/dto/update-patient.dto';
import { BreakGlassDto } from '../../presentation/dto/break-glass.dto';
export interface DecryptedPatientDto {
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
export declare class PatientService {
    private readonly databaseService;
    private readonly cryptoService;
    private readonly logger;
    constructor(databaseService: DatabaseService, cryptoService: CryptoService);
    createPatient(dto: CreatePatientDto, context: SecurityContext): Promise<DecryptedPatientDto>;
    getPatientById(id: string, context: SecurityContext, bypassConsent?: boolean): Promise<DecryptedPatientDto>;
    getAllPatients(context: SecurityContext): Promise<DecryptedPatientDto[]>;
    updatePatient(id: string, dto: UpdatePatientDto, context: SecurityContext): Promise<DecryptedPatientDto>;
    deletePatient(id: string, context: SecurityContext): Promise<void>;
    breakGlassAccess(id: string, breakGlassDto: BreakGlassDto, context: SecurityContext): Promise<{
        patient: DecryptedPatientDto;
        emergencySessionToken: string;
        notice: string;
    }>;
    exportPatientData(id: string, context: SecurityContext): Promise<{
        exportTimestamp: string;
        complianceNotice: string;
        patientRecord: DecryptedPatientDto;
    }>;
    erasePatientData(id: string, context: SecurityContext): Promise<{
        patientId: string;
        status: string;
        complianceNotice: string;
    }>;
    private decryptEntity;
}
