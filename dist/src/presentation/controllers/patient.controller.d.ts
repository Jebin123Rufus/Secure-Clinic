import { PatientService, DecryptedPatientDto } from '../../application/services/patient.service';
import { CreatePatientDto } from '../dto/create-patient.dto';
import { UpdatePatientDto } from '../dto/update-patient.dto';
import { BreakGlassDto } from '../dto/break-glass.dto';
import { SecurityContext } from '../../infrastructure/database/database.service';
export declare class PatientController {
    private readonly patientService;
    constructor(patientService: PatientService);
    create(createDto: CreatePatientDto, context: SecurityContext): Promise<DecryptedPatientDto>;
    findAll(context: SecurityContext): Promise<DecryptedPatientDto[]>;
    findOne(id: string, context: SecurityContext): Promise<DecryptedPatientDto>;
    update(id: string, updateDto: UpdatePatientDto, context: SecurityContext): Promise<DecryptedPatientDto>;
    delete(id: string, context: SecurityContext): Promise<void>;
    breakGlass(id: string, breakGlassDto: BreakGlassDto, context: SecurityContext): Promise<{
        patient: DecryptedPatientDto;
        emergencySessionToken: string;
        notice: string;
    }>;
    exportData(id: string, context: SecurityContext): Promise<{
        exportTimestamp: string;
        complianceNotice: string;
        patientRecord: DecryptedPatientDto;
    }>;
    eraseData(id: string, context: SecurityContext): Promise<{
        patientId: string;
        status: string;
        complianceNotice: string;
    }>;
}
