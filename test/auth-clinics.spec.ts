import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth & Clinics REST API Specification (Assessment Requirements)', () => {
  let app: INestApplication;

  const CLINIC_A_ID = '11111111-1111-1111-1111-111111111111';
  const CLINIC_B_ID = '22222222-2222-2222-2222-222222222222';

  let doctorAToken: string;
  let adminAToken: string;
  let doctorBToken: string;

  beforeAll(async () => {
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Authentication Security & JWT Protection', () => {
    const testDoctorEmail = `test.doctor.${Date.now()}@metro.com`;
    const testAdminEmail = `test.admin.${Date.now()}@metro.com`;
    const testDoctorBEmail = `test.doctor.b.${Date.now()}@valley.com`;
    const rawPassword = 'SecurePassword2026!';

    it('POST /auth/register: Registers user with bcrypt-hashed password and returns sanitized response', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testDoctorEmail,
          password: rawPassword,
          name: 'Dr. Test Physician',
          role: 'Doctor',
          clinicId: CLINIC_A_ID,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(testDoctorEmail.toLowerCase());
      expect(response.body.role).toBe('Doctor');
      expect(response.body.clinicId).toBe(CLINIC_A_ID);
      // SENSITIVE INFORMATION MUST NOT BE EXPOSED
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('POST /auth/login: Rejects invalid password (401 Unauthorized)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testDoctorEmail,
          password: 'WrongPassword!',
        })
        .expect(401);
    });

    it('POST /auth/login: Authenticates valid bcrypt credentials and issues signed JWT', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testDoctorEmail,
          password: rawPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body.user.email).toBe(testDoctorEmail.toLowerCase());
      // SENSITIVE INFORMATION MUST NOT BE EXPOSED
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.user).not.toHaveProperty('password_hash');

      doctorAToken = response.body.accessToken;
    });

    it('POST /auth/register & login: Set up Admin and Doctor B accounts', async () => {
      // Register & Login Admin
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testAdminEmail,
          password: rawPassword,
          name: 'Admin User',
          role: 'Admin',
          clinicId: CLINIC_A_ID,
        })
        .expect(201);

      const adminRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testAdminEmail, password: rawPassword })
        .expect(200);
      adminAToken = adminRes.body.accessToken;

      // Register & Login Doctor B (Clinic B)
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testDoctorBEmail,
          password: rawPassword,
          name: 'Dr. Michael B',
          role: 'Doctor',
          clinicId: CLINIC_B_ID,
        })
        .expect(201);

      const docBRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testDoctorBEmail, password: rawPassword })
        .expect(200);
      doctorBToken = docBRes.body.accessToken;
    });

    it('GET /auth/me: Protected route requires valid JWT authentication', async () => {
      // Missing token -> 401
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);

      // Invalid token -> 401
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload')
        .expect(401);

      // Valid token -> 200
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${doctorAToken}`)
        .expect(200);

      expect(response.body.email).toBe(testDoctorEmail.toLowerCase());
      expect(response.body.role).toBe('Doctor');
      expect(response.body).not.toHaveProperty('passwordHash');
    });
  });

  describe('2. Simple CRUD to Clinics with REST', () => {
    let createdClinicId: string;
    const uniqueClinicCode = `CLINIC_${Date.now()}`;

    it('GET /clinics: Retrieves active clinics list (including Clinic A & Clinic B)', async () => {
      const response = await request(app.getHttpServer())
        .get('/clinics')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      const codes = response.body.map((c: any) => c.code);
      expect(codes).toContain('CLINIC_A');
      expect(codes).toContain('CLINIC_B');
    });

    it('GET /clinics/:id: Retrieves single clinic details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/clinics/${CLINIC_A_ID}`)
        .expect(200);

      expect(response.body.id).toBe(CLINIC_A_ID);
      expect(response.body.code).toBe('CLINIC_A');
    });

    it('POST /clinics: Non-admin user cannot create clinic (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/clinics')
        .set('Authorization', `Bearer ${doctorAToken}`)
        .send({
          name: 'Unauthorized Clinic',
          code: 'UNAUTH_01',
        })
        .expect(403);
    });

    it('POST /clinics: Admin can create new clinic via REST', async () => {
      const response = await request(app.getHttpServer())
        .post('/clinics')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          name: 'St. Jude Children Research Center',
          code: uniqueClinicCode,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('St. Jude Children Research Center');
      expect(response.body.code).toBe(uniqueClinicCode);
      createdClinicId = response.body.id;
    });

    it('PUT /clinics/:id: Admin can update clinic details', async () => {
      const response = await request(app.getHttpServer())
        .put(`/clinics/${createdClinicId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          name: 'St. Jude Advanced Medical Research Center',
        })
        .expect(200);

      expect(response.body.name).toBe('St. Jude Advanced Medical Research Center');
    });

    it('DELETE /clinics/:id: Admin can deactivate clinic', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/clinics/${createdClinicId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('3. JWT Authentication on Multi-Tenant Patient Routes (RLS Isolation)', () => {
    let patientAId: string;

    it('Doctor A creates patient in Clinic A using valid JWT Bearer token', async () => {
      const response = await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', `Bearer ${doctorAToken}`)
        .send({
          name: 'Diana Prince',
          nationalId: 'NAT-77889900',
          contactNumber: '+1-555-0300',
          medicalNotes: 'Tachycardia episodes post exertion. ECG recommended.',
          diagnosisCode: 'R00.0',
          consentWithdrawn: false,
        })
        .expect(201);

      expect(response.body.name).toBe('Diana Prince');
      patientAId = response.body.id;
    });

    it('Doctor B (Clinic B) MUST NOT access Clinic A patient with valid Doctor B JWT (RLS Barrier)', async () => {
      await request(app.getHttpServer())
        .get(`/patients/${patientAId}`)
        .set('Authorization', `Bearer ${doctorBToken}`)
        .expect(404);
    });

    it('Doctor A CAN access Clinic A patient with valid Doctor A JWT', async () => {
      const response = await request(app.getHttpServer())
        .get(`/patients/${patientAId}`)
        .set('Authorization', `Bearer ${doctorAToken}`)
        .expect(200);

      expect(response.body.id).toBe(patientAId);
      expect(response.body.name).toBe('Diana Prince');
    });
  });
});
