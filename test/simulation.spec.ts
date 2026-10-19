import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { WormAuditService } from '../src/infrastructure/worm/worm-audit.service';

describe('Secure Healthcare Multi-Tenant Backend Simulation', () => {
  let app: INestApplication;
  let wormAuditService: WormAuditService;

  const CLINIC_A = '11111111-1111-1111-1111-111111111111';
  const CLINIC_B = '22222222-2222-2222-2222-222222222222';

  const DOCTOR_A = {
    'x-clinic-id': CLINIC_A,
    'x-user-role': 'Doctor',
    'x-user-id': 'doc-sarah-101',
  };

  const CLERK_A = {
    'x-clinic-id': CLINIC_A,
    'x-user-role': 'Clerk',
    'x-user-id': 'clerk-john-202',
  };

  const ADMIN_A = {
    'x-clinic-id': CLINIC_A,
    'x-user-role': 'Admin',
    'x-user-id': 'admin-alice-001',
  };

  const DOCTOR_B = {
    'x-clinic-id': CLINIC_B,
    'x-user-role': 'Doctor',
    'x-user-id': 'doc-michael-303',
  };

  beforeAll(async () => {
    const fs = await import('fs');
    const path = await import('path');
    const vaultPath = path.join(process.cwd(), 'storage', 'worm_audit_vault', 'worm_audit_chain.jsonl');
    if (fs.existsSync(vaultPath)) {
      try { fs.unlinkSync(vaultPath); } catch {}
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    wormAuditService = app.get(WormAuditService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. SOC 2 Type II: Multi-Tenant Data Ingress/Egress Isolation (Clinic A vs Clinic B)', () => {
    let patientAId: string;

    it('Doctor A should create a patient in Clinic A', async () => {
      const response = await request(app.getHttpServer())
        .post('/patients')
        .set(DOCTOR_A)
        .send({
          name: 'Jane Doe',
          nationalId: 'NAT-998877',
          contactNumber: '+1-555-0199',
          medicalNotes: 'Patient diagnosed with seasonal asthma.',
          diagnosisCode: 'J45.909',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Jane Doe');
      expect(response.body.nationalId).toBe('NAT-998877');
      expect(response.body.medicalNotes).toBe('Patient diagnosed with seasonal asthma.');
      expect(response.body.clinicId).toBe(CLINIC_A);

      patientAId = response.body.id;
    });

    it('Doctor B (Clinic B) MUST NOT be able to read Patient A (Cross-Tenant RLS Barrier)', async () => {
      // Clinic B tries to read Clinic A patient record
      const response = await request(app.getHttpServer())
        .get(`/patients/${patientAId}`)
        .set(DOCTOR_B)
        .expect(404);

      expect(response.body.message).toContain('not found or access denied');
    });

    it('Doctor A (Clinic A) CAN read Patient A with decrypted clinical data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/patients/${patientAId}`)
        .set(DOCTOR_A)
        .expect(200);

      expect(response.body.id).toBe(patientAId);
      expect(response.body.name).toBe('Jane Doe');
      expect(response.body.medicalNotes).toBe('Patient diagnosed with seasonal asthma.');
    });
  });

  describe('2. Role-Based Access Control Matrix & Least Privilege', () => {
    it('Clerk attempting to submit clinical diagnosis/medical notes MUST be rejected (403)', async () => {
      const response = await request(app.getHttpServer())
        .post('/patients')
        .set(CLERK_A)
        .send({
          name: 'Robert Smith',
          nationalId: 'NAT-443322',
          contactNumber: '+1-555-0144',
          medicalNotes: 'Attempting to inject medical diagnostic note as Clerk',
          diagnosisCode: 'I10',
        })
        .expect(403);

      expect(response.body.message).toContain('Clerk');
    });

    it('Clerk CAN create patient with demographic fields only', async () => {
      const response = await request(app.getHttpServer())
        .post('/patients')
        .set(CLERK_A)
        .send({
          name: 'Robert Smith',
          nationalId: 'NAT-443322',
          contactNumber: '+1-555-0144',
        })
        .expect(201);

      expect(response.body.name).toBe('Robert Smith');
      expect(response.body.medicalNotes).toBe('[RESTRICTED_CLINICAL_DATA]');
    });

    it('Clerk reading a medical patient record receives masked clinical data', async () => {
      // Create patient with Doctor
      const createRes = await request(app.getHttpServer())
        .post('/patients')
        .set(DOCTOR_A)
        .send({
          name: 'Emily Davis',
          nationalId: 'NAT-112233',
          contactNumber: '+1-555-0112',
          medicalNotes: 'Sensitive oncology oncology lab results.',
          diagnosisCode: 'C50.9',
        })
        .expect(201);

      const patientId = createRes.body.id;

      // Clerk reads record
      const clerkReadRes = await request(app.getHttpServer())
        .get(`/patients/${patientId}`)
        .set(CLERK_A)
        .expect(200);

      expect(clerkReadRes.body.name).toBe('Emily Davis');
      expect(clerkReadRes.body.medicalNotes).toBe('[RESTRICTED_CLINICAL_DATA]');
      expect(clerkReadRes.body.diagnosisCode).toBe('[RESTRICTED_CLINICAL_DATA]');
    });
  });

  describe('3. DPDPA 2023 Sec 6: Mandatory Consent Verification Lock', () => {
    let consentWithdrawnPatientId: string;

    it('Doctor creates patient who has withdrawn consent', async () => {
      const response = await request(app.getHttpServer())
        .post('/patients')
        .set(DOCTOR_A)
        .send({
          name: 'Lucas Gray',
          nationalId: 'NAT-776655',
          contactNumber: '+1-555-0177',
          medicalNotes: 'Chronic hypertension.',
          diagnosisCode: 'I10',
          consentWithdrawn: true,
        })
        .expect(201);

      consentWithdrawnPatientId = response.body.id;
    });

    it('All standard CRUD read attempts MUST be blocked natively when consent_withdrawn is true', async () => {
      const response = await request(app.getHttpServer())
        .get(`/patients/${consentWithdrawnPatientId}`)
        .set(DOCTOR_A)
        .expect(403);

      expect(response.body.error).toBe('ConsentWithdrawn');
      expect(response.body.message).toContain('withdrawn consent under DPDPA Sec 6');
    });

    it('Standard update attempts MUST also be blocked natively when consent_withdrawn is true', async () => {
      const response = await request(app.getHttpServer())
        .put(`/patients/${consentWithdrawnPatientId}`)
        .set(DOCTOR_A)
        .send({
          contactNumber: '+1-555-9999',
        })
        .expect(403);

      expect(response.body.error).toBe('ConsentWithdrawn');
    });
  });

  describe('4. HIPAA § 164.312(a)(2)(ii): Emergency Break-Glass Procedure', () => {
    let emergencyPatientId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/patients')
        .set(DOCTOR_A)
        .send({
          name: 'Sarah Connor',
          nationalId: 'NAT-990011',
          contactNumber: '+1-555-0911',
          medicalNotes: 'Severe penicillin allergy. Trauma risk.',
          diagnosisCode: 'T88.7',
          consentWithdrawn: true, // Consent withdrawn, normally locked
        })
        .expect(201);
      emergencyPatientId = res.body.id;
    });

    it('Break-Glass without sufficient emergency justification must be rejected', async () => {
      await request(app.getHttpServer())
        .post(`/patients/${emergencyPatientId}/break-glass`)
        .set(DOCTOR_A)
        .send({
          reason: 'Short', // Less than 10 characters
          authorizedBy: 'Dr. Sarah',
        })
        .expect(400); // ValidationPipe rejects length < 10
    });

    it('Break-Glass WITH valid justification bypasses consent lock during life-safety emergency', async () => {
      const response = await request(app.getHttpServer())
        .post(`/patients/${emergencyPatientId}/break-glass`)
        .set(DOCTOR_A)
        .send({
          reason: 'Severe anaphylactic emergency in ER, urgent allergy record bypass.',
          authorizedBy: 'Emergency Chief Dr. Sarah',
        })
        .expect(200);

      expect(response.body).toHaveProperty('patient');
      expect(response.body.patient.name).toBe('Sarah Connor');
      expect(response.body.patient.medicalNotes).toBe('Severe penicillin allergy. Trauma risk.');
      expect(response.body).toHaveProperty('emergencySessionToken');
      expect(response.body.notice).toContain('HIPAA § 164.312(a)(2)(ii) Emergency Break-Glass Activated');
    });
  });

  describe('5. GDPR Art. 15 (Right of Access) & Art. 17 (Right to Erasure)', () => {
    let gdprPatientId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/patients')
        .set(DOCTOR_A)
        .send({
          name: 'Alexander Hamilton',
          nationalId: 'NAT-177600',
          contactNumber: '+1-555-1776',
          medicalNotes: 'Mild asthma, seasonal.',
          diagnosisCode: 'J45.909',
        })
        .expect(201);
      gdprPatientId = res.body.id;
    });

    it('Non-admin users cannot trigger GDPR exports', async () => {
      await request(app.getHttpServer())
        .get(`/patients/${gdprPatientId}/export`)
        .set(DOCTOR_A)
        .expect(403);
    });

    it('Admin can trigger GDPR Article 15 Data Export', async () => {
      const response = await request(app.getHttpServer())
        .get(`/patients/${gdprPatientId}/export`)
        .set(ADMIN_A)
        .expect(200);

      expect(response.body).toHaveProperty('exportTimestamp');
      expect(response.body.complianceNotice).toContain('GDPR Article 15');
      expect(response.body.patientRecord.name).toBe('Alexander Hamilton');
    });

    it('Admin can trigger GDPR Article 17 Cryptographic Scrubbing / Erasure', async () => {
      const eraseRes = await request(app.getHttpServer())
        .post(`/patients/${gdprPatientId}/erase`)
        .set(ADMIN_A)
        .expect(200);

      expect(eraseRes.body.status).toBe('CRYPTOGRAPHICALLY_ERASED');
      expect(eraseRes.body.complianceNotice).toContain('GDPR Article 17');

      // Verify that subsequent retrieval reflects scrubbed data
      const getRes = await request(app.getHttpServer())
        .get(`/patients/${gdprPatientId}`)
        .set(DOCTOR_A)
        .expect(200);

      expect(getRes.body.name).toBe('[ANONYMIZED / PURGED]');
      expect(getRes.body.medicalNotes).toBeNull();
      expect(getRes.body.isAnonymized).toBe(true);
    });
  });

  describe('6. SOC 2 Type II: WORM Immutable Audit Log Chain Verification', () => {
    it('WORM audit vault must maintain valid SHA-256 hash chaining across all transactions', async () => {
      const verification = await wormAuditService.verifyVaultIntegrity();
      expect(verification.valid).toBe(true);
      expect(verification.totalRecords).toBeGreaterThan(0);
    });
  });
});
