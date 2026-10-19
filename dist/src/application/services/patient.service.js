"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PatientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const database_service_1 = require("../../infrastructure/database/database.service");
const crypto_service_1 = require("../../infrastructure/crypto/crypto.service");
const patient_entity_1 = require("../../domain/entities/patient.entity");
const consent_withdrawn_exception_1 = require("../../domain/exceptions/consent-withdrawn.exception");
const tamper_detected_exception_1 = require("../../domain/exceptions/tamper-detected.exception");
let PatientService = PatientService_1 = class PatientService {
    constructor(databaseService, cryptoService) {
        this.databaseService = databaseService;
        this.cryptoService = cryptoService;
        this.logger = new common_1.Logger(PatientService_1.name);
    }
    async createPatient(dto, context) {
        const patientId = (0, uuid_1.v4)();
        const encryptedName = this.cryptoService.encrypt(dto.name);
        const encryptedNationalId = this.cryptoService.encrypt(dto.nationalId);
        const encryptedContact = this.cryptoService.encrypt(dto.contactNumber);
        const recordHash = this.cryptoService.computeIntegrityHash({
            clinicId: context.clinicId,
            encryptedNationalId,
            diagnosisCode: dto.diagnosisCode,
            medicalNotes: dto.medicalNotes,
        });
        const consentWithdrawn = dto.consentWithdrawn ?? false;
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
        const result = await this.databaseService.executeScopedQuery(insertQuery, params, context);
        const row = result.rows[0];
        const entity = patient_entity_1.PatientEntity.fromRow(row);
        return this.decryptEntity(entity, context.userRole);
    }
    async getPatientById(id, context, bypassConsent = false) {
        const query = `SELECT * FROM patients WHERE id = $1 LIMIT 1;`;
        const result = await this.databaseService.executeScopedQuery(query, [id], context);
        if (result.rows.length === 0) {
            throw new common_1.NotFoundException(`Patient record [${id}] not found or access denied by Row-Level Security policy.`);
        }
        const entity = patient_entity_1.PatientEntity.fromRow(result.rows[0]);
        if (entity.consentWithdrawn && !bypassConsent && !context.isBreakGlass) {
            throw new consent_withdrawn_exception_1.ConsentWithdrawnException(entity.id);
        }
        if (!entity.isAnonymized) {
            const isIntegrityValid = this.cryptoService.verifyIntegrity(entity.recordHash, {
                clinicId: entity.clinicId,
                encryptedNationalId: entity.encryptedNationalId,
                diagnosisCode: entity.diagnosisCode || undefined,
                medicalNotes: entity.medicalNotes || undefined,
            });
            if (!isIntegrityValid) {
                const computed = this.cryptoService.computeIntegrityHash({
                    clinicId: entity.clinicId,
                    encryptedNationalId: entity.encryptedNationalId,
                    diagnosisCode: entity.diagnosisCode || undefined,
                    medicalNotes: entity.medicalNotes || undefined,
                });
                throw new tamper_detected_exception_1.TamperDetectedException(entity.id, entity.recordHash, computed);
            }
        }
        return this.decryptEntity(entity, context.userRole);
    }
    async getAllPatients(context) {
        const query = `SELECT * FROM patients ORDER BY created_at DESC;`;
        const result = await this.databaseService.executeScopedQuery(query, [], context);
        return result.rows.map((row) => {
            const entity = patient_entity_1.PatientEntity.fromRow(row);
            return this.decryptEntity(entity, context.userRole);
        });
    }
    async updatePatient(id, dto, context) {
        const query = `SELECT * FROM patients WHERE id = $1 LIMIT 1;`;
        const result = await this.databaseService.executeScopedQuery(query, [id], context);
        if (result.rows.length === 0) {
            throw new common_1.NotFoundException(`Patient record [${id}] not found or access denied by Row-Level Security policy.`);
        }
        const entity = patient_entity_1.PatientEntity.fromRow(result.rows[0]);
        if (entity.consentWithdrawn && dto.consentWithdrawn === undefined && !context.isBreakGlass) {
            throw new consent_withdrawn_exception_1.ConsentWithdrawnException(entity.id);
        }
        if (context.userRole === 'Clerk') {
            if (dto.medicalNotes !== undefined || dto.diagnosisCode !== undefined) {
                throw new common_1.ForbiddenException('Clerk role cannot update clinical diagnostic fields (medicalNotes, diagnosisCode).');
            }
        }
        let newEncryptedName = entity.encryptedName;
        if (dto.name) {
            newEncryptedName = this.cryptoService.encrypt(dto.name);
        }
        let newEncryptedContact = entity.encryptedContact;
        if (dto.contactNumber) {
            newEncryptedContact = this.cryptoService.encrypt(dto.contactNumber);
        }
        const newMedicalNotes = dto.medicalNotes !== undefined ? dto.medicalNotes : entity.medicalNotes;
        const newDiagnosisCode = dto.diagnosisCode !== undefined ? dto.diagnosisCode : entity.diagnosisCode;
        const newConsentWithdrawn = dto.consentWithdrawn !== undefined
            ? dto.consentWithdrawn
            : entity.consentWithdrawn;
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
        const updateResult = await this.databaseService.executeScopedQuery(updateQuery, updateParams, context);
        const updatedEntity = patient_entity_1.PatientEntity.fromRow(updateResult.rows[0]);
        return this.decryptEntity(updatedEntity, context.userRole);
    }
    async deletePatient(id, context) {
        const query = `DELETE FROM patients WHERE id = $1;`;
        const result = await this.databaseService.executeScopedQuery(query, [id], context);
        if (result.rowCount === 0) {
            throw new common_1.NotFoundException(`Patient record [${id}] not found or access denied by Row-Level Security policy.`);
        }
    }
    async breakGlassAccess(id, breakGlassDto, context) {
        const emergencyContext = {
            ...context,
            isBreakGlass: true,
            breakGlassReason: breakGlassDto.reason,
        };
        const patient = await this.getPatientById(id, emergencyContext, true);
        const sessionToken = this.cryptoService.generateSecureToken(32);
        return {
            patient,
            emergencySessionToken: sessionToken,
            notice: 'HIPAA § 164.312(a)(2)(ii) Emergency Break-Glass Activated. Complete forensic trail stream dispatched to immutable WORM storage.',
        };
    }
    async exportPatientData(id, context) {
        if (context.userRole !== 'Admin') {
            throw new common_1.ForbiddenException('GDPR Art. 15 / DPDPA Sec 11 Data Exports can only be triggered by an authorized Administrator.');
        }
        const patient = await this.getPatientById(id, context, true);
        return {
            exportTimestamp: new Date().toISOString(),
            complianceNotice: 'Export generated pursuant to GDPR Article 15 (Right of Access) & India DPDPA 2023 Section 11.',
            patientRecord: patient,
        };
    }
    async erasePatientData(id, context) {
        if (context.userRole !== 'Admin') {
            throw new common_1.ForbiddenException('GDPR Art. 17 / DPDPA Sec 12 Erasure actions can only be authorized by an Administrator.');
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
            throw new common_1.NotFoundException(`Patient record [${id}] not found or access denied by Row-Level Security policy.`);
        }
        return {
            patientId: id,
            status: 'CRYPTOGRAPHICALLY_ERASED',
            complianceNotice: 'Personal Data irreversibly purged pursuant to GDPR Article 17 (Right to Erasure) & DPDPA Section 12.',
        };
    }
    decryptEntity(entity, userRole) {
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
};
exports.PatientService = PatientService;
exports.PatientService = PatientService = PatientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        crypto_service_1.CryptoService])
], PatientService);
//# sourceMappingURL=patient.service.js.map