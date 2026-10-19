"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientEntity = void 0;
class PatientEntity {
    constructor(props) {
        this._id = props.id;
        this._clinicId = props.clinicId;
        this._encryptedName = props.encryptedName;
        this._encryptedNationalId = props.encryptedNationalId;
        this._encryptedContact = props.encryptedContact;
        this._medicalNotes = props.medicalNotes ?? null;
        this._diagnosisCode = props.diagnosisCode ?? null;
        this._consentWithdrawn = props.consentWithdrawn ?? false;
        this._recordHash = props.recordHash;
        this._isAnonymized = props.isAnonymized ?? false;
        this._anonymizedAt = props.anonymizedAt ?? null;
        this._createdAt = props.createdAt ?? new Date();
        this._updatedAt = props.updatedAt ?? new Date();
    }
    get id() {
        return this._id;
    }
    get clinicId() {
        return this._clinicId;
    }
    get encryptedName() {
        return this._encryptedName;
    }
    get encryptedNationalId() {
        return this._encryptedNationalId;
    }
    get encryptedContact() {
        return this._encryptedContact;
    }
    get medicalNotes() {
        return this._medicalNotes;
    }
    get diagnosisCode() {
        return this._diagnosisCode;
    }
    get consentWithdrawn() {
        return this._consentWithdrawn;
    }
    get recordHash() {
        return this._recordHash;
    }
    get isAnonymized() {
        return this._isAnonymized;
    }
    get anonymizedAt() {
        return this._anonymizedAt;
    }
    get createdAt() {
        return this._createdAt;
    }
    get updatedAt() {
        return this._updatedAt;
    }
    isConsentValid() {
        return !this._consentWithdrawn;
    }
    updateDemographics(encryptedName, encryptedContact, newHash) {
        this._encryptedName = encryptedName;
        this._encryptedContact = encryptedContact;
        this._recordHash = newHash;
        this._updatedAt = new Date();
    }
    updateMedicalData(medicalNotes, diagnosisCode, newHash) {
        this._medicalNotes = medicalNotes;
        this._diagnosisCode = diagnosisCode;
        this._recordHash = newHash;
        this._updatedAt = new Date();
    }
    setConsentStatus(withdrawn) {
        this._consentWithdrawn = withdrawn;
        this._updatedAt = new Date();
    }
    executeCryptographicPurge() {
        this._encryptedName = 'ANONYMIZED_PURGED';
        this._encryptedNationalId = 'ANONYMIZED_PURGED';
        this._encryptedContact = 'ANONYMIZED_PURGED';
        this._medicalNotes = null;
        this._diagnosisCode = null;
        this._recordHash = '0000000000000000000000000000000000000000000000000000000000000000';
        this._isAnonymized = true;
        this._anonymizedAt = new Date();
        this._updatedAt = new Date();
    }
    toPersistence() {
        return {
            id: this._id,
            clinicId: this._clinicId,
            encryptedName: this._encryptedName,
            encryptedNationalId: this._encryptedNationalId,
            encryptedContact: this._encryptedContact,
            medicalNotes: this._medicalNotes,
            diagnosisCode: this._diagnosisCode,
            consentWithdrawn: this._consentWithdrawn,
            recordHash: this._recordHash,
            isAnonymized: this._isAnonymized,
            anonymizedAt: this._anonymizedAt,
            createdAt: this._createdAt,
            updatedAt: this._updatedAt,
        };
    }
    static fromRow(row) {
        return new PatientEntity({
            id: row.id,
            clinicId: row.clinic_id,
            encryptedName: row.encrypted_name,
            encryptedNationalId: row.encrypted_national_id,
            encryptedContact: row.encrypted_contact,
            medicalNotes: row.medical_notes,
            diagnosisCode: row.diagnosis_code,
            consentWithdrawn: row.consent_withdrawn,
            recordHash: row.record_hash,
            isAnonymized: row.is_anonymized,
            anonymizedAt: row.anonymized_at ? new Date(row.anonymized_at) : null,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}
exports.PatientEntity = PatientEntity;
//# sourceMappingURL=patient.entity.js.map