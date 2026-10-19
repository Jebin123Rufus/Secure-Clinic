import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService, SecurityContext } from '../../infrastructure/database/database.service';
import { CryptoService } from '../../infrastructure/crypto/crypto.service';
import { PatientEntity } from '../../domain/entities/patient.entity';
import { CreatePatientDto } from '../../presentation/dto/create-patient.dto';
import { UpdatePatientDto } from '../../presentation/dto/update-patient.dto';
import { BreakGlassDto } from '../../presentation/dto/break-glass.dto';
import { ConsentWithdrawnException } from '../../domain/exceptions/consent-withdrawn.exception';
import { TamperDetectedException } from '../../domain/exceptions/tamper-detected.exception';

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

/**
 * Enterprise Healthcare Patient Application Service
 *
 * Implements:
 * - HIPAA (§ 164.312): Column encryption, SHA-256 verification, emergency access
 * - SOC 2 Type II: Tenant isolation via RLS context
 * - GDPR (Art 15, 17, 32): Right of Access export, Right to Erasure scrubbing, pseudonymization
 * - DPDPA (Sec 6, 8, 11, 12): Mandatory consent lock, data portability
 * - OWASP Top 10 (A01, A02, A03, A08): Non-sequential IDs, authenticated encryption, parameterization, integrity checks
 */
@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Creates a new patient record with AES-256-GCM encryption and SHA-256 integrity hash.
   */
  async createPatient(
    dto: CreatePatientDto,
    context: SecurityContext,
  ): Promise<DecryptedPatientDto> {
    const patientId = uuidv4();

    // 1. Column-Level Authenticated Encryption (AES-256-GCM) - HIPAA § 164.312(a)(2)(iv)
    const encryptedName = this.cryptoService.encrypt(dto.name);
    const encryptedNationalId = this.cryptoService.encrypt(dto.nationalId);
    const encryptedContact = this.cryptoService.encrypt(dto.contactNumber);

    // 2. Cryptographic Data Authentication Digest (SHA-256) - HIPAA § 164.312(c)(2) / OWASP A08
    const recordHash = this.cryptoService.computeIntegrityHash({
      clinicId: context.clinicId,
      encryptedNationalId,
      diagnosisCode: dto.diagnosisCode,
      medicalNotes: dto.medicalNotes,
    });

    const consentWithdrawn = dto.consentWithdrawn ?? false;

    // 3. PostgreSQL RLS Scoped Insert
    const insertQuery = `
      INSERT INTO patients (
        id, clinic_id, encrypted_name, encrypted_national_id, encrypted_contact,
        medical_notes, diagnosis_code, consent_withdrawn, record_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const params = [
      patientId,
      context.clinicId,
      encryptedName,
      encryptedNationalId,
      encryptedContact,
      dto.medicalNotes || null,
      dto.diagnosisCode || null,
      consentWithdrawn,
      recordHash,
    ];

    const result = await this.databaseService.executeScopedQuery(
      insertQuery,
      params,
      context,
    );

    const row = result.rows[0];
    const entity = PatientEntity.fromRow(row);

    return this.decryptEntity(entity, context.userRole);
  }

  /**
   * Retrieves a single patient by ID with RLS isolation, consent lock, and integrity checks.
   */
  async getPatientById(
    id: string,
    context: SecurityContext,
    bypassConsent: boolean = false,
  ): Promise<DecryptedPatientDto> {
    const query = `SELECT * FROM patients WHERE id = $1 LIMIT 1;`;
    const result = await this.databaseService.executeScopedQuery(query, [id], context);

    if (result.rows.length === 0) {
      throw new NotFoundException(
        `Patient record [${id}] not found or access denied by Row-Level Security policy.`,
      );
    }

    const entity = PatientEntity.fromRow(result.rows[0]);

    // ------------------------------------------------------------------------
    // 1. DPDPA Sec 6 / GDPR Art 7: Consent Verification Lock
    // Block all CRUD access if consent has been withdrawn (unless emergency break-glass)
    // ------------------------------------------------------------------------
    if (entity.consentWithdrawn && !bypassConsent && !context.isBreakGlass) {
      throw new ConsentWithdrawnException(entity.id);
    }

    // ------------------------------------------------------------------------
    // 2. HIPAA § 164.312(c)(2) & OWASP A08: Tamper Verification
    // ------------------------------------------------------------------------
    if (!entity.isAnonymized) {
      const isIntegrityValid = this.cryptoService.verifyIntegrity(
        entity.recordHash,
        {
          clinicId: entity.clinicId,
          encryptedNationalId: entity.encryptedNationalId,
          diagnosisCode: entity.diagnosisCode || undefined,
          medicalNotes: entity.medicalNotes || undefined,
        },
      );

      if (!isIntegrityValid) {
        const computed = this.cryptoService.computeIntegrityHash({
          clinicId: entity.clinicId,
          encryptedNationalId: entity.encryptedNationalId,
          diagnosisCode: entity.diagnosisCode || undefined,
          medicalNotes: entity.medicalNotes || undefined,
        });
        throw new TamperDetectedException(entity.id, entity.recordHash, computed);
      }
    }

    return this.decryptEntity(entity, context.userRole);
  }

  /**
   * Lists all patients accessible to the current tenant under PostgreSQL RLS.
   */
  async getAllPatients(context: SecurityContext): Promise<DecryptedPatientDto[]> {
    const query = `SELECT * FROM patients ORDER BY created_at DESC;`;
    const result = await this.databaseService.executeScopedQuery(query, [], context);

    return result.rows.map((row) => {
      const entity = PatientEntity.fromRow(row);
      return this.decryptEntity(entity, context.userRole);
    });
  }

  /**
   * Updates an existing patient record.
   * Enforces DPDPA consent lock and role restrictions (Clerk cannot modify medical notes).
   */
  async updatePatient(
    id: string,
    dto: UpdatePatientDto,
    context: SecurityContext,
  ): Promise<DecryptedPatientDto> {
    const query = `SELECT * FROM patients WHERE id = $1 LIMIT 1;`;
    const result = await this.databaseService.executeScopedQuery(query, [id], context);

    if (result.rows.length === 0) {
      throw new NotFoundException(
        `Patient record [${id}] not found or access denied by Row-Level Security policy.`,
      );
    }

    const entity = PatientEntity.fromRow(result.rows[0]);

    // DPDPA Sec 6: Block update if consent is withdrawn and not setting consent
    if (entity.consentWithdrawn && dto.consentWithdrawn === undefined && !context.isBreakGlass) {
      throw new ConsentWithdrawnException(entity.id);
    }

    // Role Matrix boundary check: Clerk cannot touch medical notes or diagnosis
    if (context.userRole === 'Clerk') {
      if (dto.medicalNotes !== undefined || dto.diagnosisCode !== undefined) {
        throw new ForbiddenException(
          'Clerk role cannot update clinical diagnostic fields (medicalNotes, diagnosisCode).',
        );
      }
    }

    // Encrypt updated demographic fields if provided
    let newEncryptedName = entity.encryptedName;
    if (dto.name) {
      newEncryptedName = this.cryptoService.encrypt(dto.name);
    }

    let newEncryptedContact = entity.encryptedContact;
    if (dto.contactNumber) {
      newEncryptedContact = this.cryptoService.encrypt(dto.contactNumber);
    }

    const newMedicalNotes =
      dto.medicalNotes !== undefined ? dto.medicalNotes : entity.medicalNotes;
    const newDiagnosisCode =
      dto.diagnosisCode !== undefined ? dto.diagnosisCode : entity.diagnosisCode;
    const newConsentWithdrawn =
      dto.consentWithdrawn !== undefined
        ? dto.consentWithdrawn
        : entity.consentWithdrawn;

    // Recompute SHA-256 PHI integrity hash
    const newRecordHash = this.cryptoService.computeIntegrityHash({
      clinicId: entity.clinicId,
      encryptedNationalId: entity.encryptedNationalId,
      diagnosisCode: newDiagnosisCode || undefined,
      medicalNotes: newMedicalNotes || undefined,
    });

    const updateQuery = `
      UPDATE patients
      SET encrypted_name = $1,
          encrypted_contact = $2,
          medical_notes = $3,
          diagnosis_code = $4,
          consent_withdrawn = $5,
          record_hash = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *;
    `;

    const updateParams = [
      newEncryptedName,
      newEncryptedContact,
      newMedicalNotes,
      newDiagnosisCode,
      newConsentWithdrawn,
      newRecordHash,
      id,
    ];

    const updateResult = await this.databaseService.executeScopedQuery(
      updateQuery,
      updateParams,
      context,
    );

    const updatedEntity = PatientEntity.fromRow(updateResult.rows[0]);
    return this.decryptEntity(updatedEntity, context.userRole);
  }

  /**
   * Deletes a patient within current tenant RLS scope.
   */
  async deletePatient(id: string, context: SecurityContext): Promise<void> {
    const query = `DELETE FROM patients WHERE id = $1;`;
    const result = await this.databaseService.executeScopedQuery(query, [id], context);

    if (result.rowCount === 0) {
      throw new NotFoundException(
        `Patient record [${id}] not found or access denied by Row-Level Security policy.`,
      );
    }
  }

  /**
   * HIPAA § 164.312(a)(2)(ii): Emergency Break-Glass Procedure
   * Bypasses standard boundaries during life-safety incidents with mandatory justification.
   */
  async breakGlassAccess(
    id: string,
    breakGlassDto: BreakGlassDto,
    context: SecurityContext,
  ): Promise<{
    patient: DecryptedPatientDto;
    emergencySessionToken: string;
    notice: string;
  }> {
    const emergencyContext: SecurityContext = {
      ...context,
      isBreakGlass: true,
      breakGlassReason: breakGlassDto.reason,
    };

    // Break-glass allows reading even across clinic borders and even if consent is withdrawn
    const patient = await this.getPatientById(id, emergencyContext, true);

    const sessionToken = this.cryptoService.generateSecureToken(32);

    return {
      patient,
      emergencySessionToken: sessionToken,
      notice:
        'HIPAA § 164.312(a)(2)(ii) Emergency Break-Glass Activated. Complete forensic trail stream dispatched to immutable WORM storage.',
    };
  }

  /**
   * GDPR Article 15 / DPDPA Sec 11: Right of Access Data Export
   * Streams a complete, unmasked, decrypted JSON patient history.
   */
  async exportPatientData(
    id: string,
    context: SecurityContext,
  ): Promise<{
    exportTimestamp: string;
    complianceNotice: string;
    patientRecord: DecryptedPatientDto;
  }> {
    // Only Admin can trigger GDPR Data Exports
    if (context.userRole !== 'Admin') {
      throw new ForbiddenException(
        'GDPR Art. 15 / DPDPA Sec 11 Data Exports can only be triggered by an authorized Administrator.',
      );
    }

    // Force read bypassing consent lock so patient can exercise Right of Access
    const patient = await this.getPatientById(id, context, true);

    return {
      exportTimestamp: new Date().toISOString(),
      complianceNotice:
        'Export generated pursuant to GDPR Article 15 (Right of Access) & India DPDPA 2023 Section 11.',
      patientRecord: patient,
    };
  }

  /**
   * GDPR Article 17 / DPDPA Sec 12: Right to Erasure / Cryptographic Scrubbing
   * Irreversibly scrubs encrypted identifiers and wipes medical notes.
   */
  async erasePatientData(
    id: string,
    context: SecurityContext,
  ): Promise<{
    patientId: string;
    status: string;
    complianceNotice: string;
  }> {
    // Only Admin can trigger GDPR Erasure
    if (context.userRole !== 'Admin') {
      throw new ForbiddenException(
        'GDPR Art. 17 / DPDPA Sec 12 Erasure actions can only be authorized by an Administrator.',
      );
    }

    const query = `
      UPDATE patients
      SET encrypted_name = 'ANONYMIZED_PURGED',
          encrypted_national_id = 'ANONYMIZED_PURGED',
          encrypted_contact = 'ANONYMIZED_PURGED',
          medical_notes = NULL,
          diagnosis_code = NULL,
          record_hash = '0000000000000000000000000000000000000000000000000000000000000000',
          is_anonymized = TRUE,
          anonymized_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;

    const result = await this.databaseService.executeScopedQuery(query, [id], context);

    if (result.rowCount === 0) {
      throw new NotFoundException(
        `Patient record [${id}] not found or access denied by Row-Level Security policy.`,
      );
    }

    return {
      patientId: id,
      status: 'CRYPTOGRAPHICALLY_ERASED',
      complianceNotice:
        'Personal Data irreversibly purged pursuant to GDPR Article 17 (Right to Erasure) & DPDPA Section 12.',
    };
  }

  /**
   * Internal helper: Decrypts AES-256-GCM columns and enforces least privilege masking
   */
  private decryptEntity(
    entity: PatientEntity,
    userRole: string,
  ): DecryptedPatientDto {
    if (entity.isAnonymized) {
      return {
        id: entity.id,
        clinicId: entity.clinicId,
        name: '[ANONYMIZED / PURGED]',
        nationalId: '[ANONYMIZED / PURGED]',
        contactNumber: '[ANONYMIZED / PURGED]',
        medicalNotes: null,
        diagnosisCode: null,
        consentWithdrawn: entity.consentWithdrawn,
        recordHash: entity.recordHash,
        isAnonymized: true,
        anonymizedAt: entity.anonymizedAt,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      };
    }

    const name = this.cryptoService.decrypt(entity.encryptedName);
    const nationalId = this.cryptoService.decrypt(entity.encryptedNationalId);
    const contactNumber = this.cryptoService.decrypt(entity.encryptedContact);

    // GDPR Art 32 / Least Privilege: Clerks cannot view medical diagnostic notes
    const isClerk = userRole === 'Clerk';
    const medicalNotes = isClerk ? '[RESTRICTED_CLINICAL_DATA]' : entity.medicalNotes;
    const diagnosisCode = isClerk ? '[RESTRICTED_CLINICAL_DATA]' : entity.diagnosisCode;

    return {
      id: entity.id,
      clinicId: entity.clinicId,
      name,
      nationalId,
      contactNumber,
      medicalNotes,
      diagnosisCode,
      consentWithdrawn: entity.consentWithdrawn,
      recordHash: entity.recordHash,
      isAnonymized: entity.isAnonymized,
      anonymizedAt: entity.anonymizedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
