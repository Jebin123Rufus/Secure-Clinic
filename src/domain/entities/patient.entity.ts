/**
 * Enterprise Clean Architecture Domain Entity: Patient
 *
 * Implements:
 * - Unique Identifiers (UUIDv4) - OWASP A01:2021 (Mitigating IDOR via non-sequential keys)
 * - HIPAA § 164.312(a)(2)(iv): Column-level encrypted PHI markers
 * - HIPAA § 164.312(c)(2): SHA-256 data integrity authentication digest
 * - DPDPA Sec 6: Explicit consent withdrawal flag
 * - GDPR Art 17 / DPDPA Sec 12: Cryptographic erasure / anonymization markers
 * - GDPR Art 32 / DPDPA Sec 8: Segregation of direct identifiers from diagnostic medical notes
 */
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

export class PatientEntity {
  private readonly _id: string;
  private readonly _clinicId: string;
  private _encryptedName: string;
  private _encryptedNationalId: string;
  private _encryptedContact: string;
  private _medicalNotes: string | null;
  private _diagnosisCode: string | null;
  private _consentWithdrawn: boolean;
  private _recordHash: string;
  private _isAnonymized: boolean;
  private _anonymizedAt: Date | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: PatientProperties) {
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

  // Getters
  public get id(): string {
    return this._id;
  }

  public get clinicId(): string {
    return this._clinicId;
  }

  public get encryptedName(): string {
    return this._encryptedName;
  }

  public get encryptedNationalId(): string {
    return this._encryptedNationalId;
  }

  public get encryptedContact(): string {
    return this._encryptedContact;
  }

  public get medicalNotes(): string | null {
    return this._medicalNotes;
  }

  public get diagnosisCode(): string | null {
    return this._diagnosisCode;
  }

  public get consentWithdrawn(): boolean {
    return this._consentWithdrawn;
  }

  public get recordHash(): string {
    return this._recordHash;
  }

  public get isAnonymized(): boolean {
    return this._isAnonymized;
  }

  public get anonymizedAt(): Date | null {
    return this._anonymizedAt;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Evaluates if operations can proceed under India DPDPA Sec 6
   */
  public isConsentValid(): boolean {
    return !this._consentWithdrawn;
  }

  /**
   * Updates non-medical demographic fields (permitted for Clerk role).
   */
  public updateDemographics(
    encryptedName: string,
    encryptedContact: string,
    newHash: string,
  ): void {
    this._encryptedName = encryptedName;
    this._encryptedContact = encryptedContact;
    this._recordHash = newHash;
    this._updatedAt = new Date();
  }

  /**
   * Updates clinical and medical fields (restricted to Doctor role only).
   */
  public updateMedicalData(
    medicalNotes: string | null,
    diagnosisCode: string | null,
    newHash: string,
  ): void {
    this._medicalNotes = medicalNotes;
    this._diagnosisCode = diagnosisCode;
    this._recordHash = newHash;
    this._updatedAt = new Date();
  }

  /**
   * Sets the consent state (DPDPA 2023 Sec 6).
   */
  public setConsentStatus(withdrawn: boolean): void {
    this._consentWithdrawn = withdrawn;
    this._updatedAt = new Date();
  }

  /**
   * Executes GDPR Article 17 / DPDPA Sec 12 cryptographic erasure.
   * Irreversibly scrubs identifiers and clinical notes.
   */
  public executeCryptographicPurge(): void {
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

  /**
   * Serializes entity state to pure object for persistence layer.
   */
  public toPersistence(): PatientProperties {
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

  /**
   * Factory method to reconstruct domain entity from database row.
   */
  public static fromRow(row: any): PatientEntity {
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
