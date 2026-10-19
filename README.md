#  SecureClinic: Production-Grade Healthcare Backend

A hardened, multi-tenant healthcare backend simulation template built with **NestJS**, **PostgreSQL Row-Level Security (RLS)**, and **Clean/Hexagonal Architecture**. Engineered to satisfy the rigorous compliance mandates of **HIPAA**, **SOC 2 Type II**, **GDPR**, **India DPDPA 2023**, and the **OWASP Top 10**.

---

##  Architecture & Compliance Matrix

| Compliance Mandate | Regulatory Section | Architectural Implementation |
| :--- | :--- | :--- |
| **HIPAA** | § 164.312(a)(2)(i) Unique User Identification | Enforced via mandatory `x-user-id` context in `RlsContextMiddleware`. |
| **HIPAA** | § 164.312(a)(2)(ii) Emergency Access ("Break-Glass") | Dedicated `/patients/:id/break-glass` endpoint and `RolesGuard` override capturing justification. |
| **HIPAA** | § 164.312(a)(2)(iv) Encryption at Rest | AES-256-GCM authenticated column-level encryption in `CryptoService`. |
| **HIPAA** | § 164.312(b) Audit Controls | `AuditLogInterceptor` capturing User ID, Action, Timestamp, Resource ID, IP, and Status. |
| **HIPAA** | § 164.312(c)(2) Mechanism to Authenticate PHI | SHA-256 integrity hash column (`record_hash`) verified on every read and write. |
| **SOC 2 Type II** | Logical Separation of Duties | Split migration role (`postgres`) and runtime connection role (`secure_clinic_app`). |
| **SOC 2 Type II** | Tenant Data Ingress/Egress Guardrails | Dynamic PostgreSQL Row-Level Security (`current_setting('app.current_clinic_id', true)`). |
| **SOC 2 Type II** | WORM Audit Trail | `WormAuditService` simulating S3 Object Lock via cryptographically chained SHA-256 hashes. |
| **SOC 2 Type II** | Continuous Monitoring | Telemetry endpoint at `/health` reporting database and WORM audit integrity status. |
| **GDPR / DPDPA** | GDPR Art. 15 / DPDPA Sec 11 Right of Access | One-click JSON data export endpoint `/patients/:id/export`. |
| **GDPR / DPDPA** | GDPR Art. 17 / DPDPA Sec 12 Right to Erasure | Cryptographic scrubbing endpoint `/patients/:id/erase` purging PII while maintaining audit logs. |
| **GDPR / DPDPA** | GDPR Art. 32 / DPDPA Sec 8 Security of Processing | Pseudonymisation and isolation of direct identifiers (`name`, `nationalId`) from clinical notes. |
| **DPDPA** | Sec 6 Consent Verification | Hard barrier: All CRUD operations rejected if `consent_withdrawn === true`. |
| **OWASP Top 10** | A01: Broken Access Control | Tenant isolation guards, non-sequential UUIDv4 primary keys (preventing IDOR). |
| **OWASP Top 10** | A02: Cryptographic Failures | AES-256-GCM authenticated encryption with 96-bit random IVs and 128-bit authentication tags. |
| **OWASP Top 10** | A03: Injection | Strict `ValidationPipe` with whitelist and regex constraints, parameterized SQL queries. |
| **OWASP Top 10** | A05: Security Misconfiguration | Helmet security headers, CORS strict origins, disabled `X-Powered-By`. |
| **OWASP Top 10** | A08: Software & Data Integrity | Cryptographic record checksums preventing unauthorized out-of-band DB tampering. |

---

## 👥 Role-Based Access Control (RBAC) Matrix

| Operation | Endpoint | Protected By | Doctor | Clerk | Admin | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Register User** | `POST /auth/register` | Rate Limit | 🌐 | 🌐 | 🌐 | Hashes password with bcrypt (10 rounds); strips hash from response. |
| **Login** | `POST /auth/login` | Rate Limit | 🌐 | 🌐 | 🌐 | Brute-force protected; issues signed JWT token on success. |
| **User Profile** | `GET /auth/me` | JWT Guard | ✅ | ✅ | ✅ | Returns authenticated actor details (password_hash never exposed). |
| **List Clinics** | `GET /clinics` | Public/Auth | ✅ | ✅ | ✅ | Retrieves active tenant clinics (Clinic A and Clinic B). |
| **Get Clinic** | `GET /clinics/:id` | Public/Auth | ✅ | ✅ | ✅ | Retrieves details for single clinic. |
| **Create Clinic** | `POST /clinics` | JWT + RBAC | ❌ | ❌ | ✅ | Admin only; parameterized SQL prevents injection. |
| **Update Clinic** | `PUT /clinics/:id` | JWT + RBAC | ❌ | ❌ | ✅ | Admin only. |
| **Delete Clinic** | `DELETE /clinics/:id` | JWT + RBAC | ❌ | ❌ | ✅ | Admin only soft deactivation. |
| **Create Patient** | `POST /patients` | JWT + RBAC | ✅ | ✅ (Demographics only) | ❌ | Clerks cannot provide `medicalNotes` or `diagnosisCode`. |
| **List Patients** | `GET /patients` | JWT + RBAC | ✅ | ✅ (Masked notes) | ✅ | Enforced strictly to tenant via PostgreSQL RLS. |
| **Get Patient** | `GET /patients/:id` | JWT + RBAC | ✅ | ✅ (Masked notes) | ✅ | Blocks if `consent_withdrawn === true` (DPDPA Sec 6). |
| **Update Patient** | `PUT /patients/:id` | JWT + RBAC | ✅ | ✅ (Demographics only) | ❌ | Clerks rejected if updating medical fields. |
| **Delete Patient** | `DELETE /patients/:id` | JWT + RBAC | ✅ | ❌ | ✅ | Isolated to tenant. |
| **Break-Glass** | `POST /patients/:id/break-glass` | JWT + RBAC | ✅ | ❌ | ✅ | Emergency bypass with high-priority WORM alert. |
| **GDPR Export** | `GET /patients/:id/export` | JWT + RBAC | ❌ | ❌ | ✅ | Full decrypted patient history. |
| **GDPR Erasure** | `POST /patients/:id/erase` | JWT + RBAC | ❌ | ❌ | ✅ | Unrecoverable cryptographic purge. |

---

## 📁 Repository Structure

```
src/
├── database/
│   ├── schema.sql                    # PostgreSQL DDL with RLS Policies & Grants
│   ├── init-db.ts                    # Migration script
│   └── seed-simulation.ts            # Multi-tenant seeding script
├── domain/
│   ├── entities/
│   │   ├── user.entity.ts            # User entity with safe sanitization (no password_hash)
│   │   ├── clinic.entity.ts          # Tenant clinic entity
│   │   ├── patient.entity.ts         # Encrypted domain patient entity
│   │   └── audit-log.entity.ts       # Audit trail entity
│   └── exceptions/
│       ├── consent-withdrawn.exception.ts
│       ├── tamper-detected.exception.ts
│       └── break-glass-unauthorized.exception.ts
├── infrastructure/
│   ├── crypto/
│   │   ├── crypto.service.ts         # AES-256-GCM & SHA-256 integrity hashing
│   │   └── crypto.module.ts
│   ├── database/
│   │   ├── database.service.ts       # Pool manager & RLS parameterized query executor
│   │   ├── database.module.ts
│   │   └── rls-context.middleware.ts # Tenant context & JWT extraction middleware
│   └── worm/
│       └── worm-audit.service.ts     # Immutable WORM append-only hash vault
├── application/
│   └── services/
│       ├── auth.service.ts           # Bcrypt hashing (10 rounds) & JWT issuance/validation
│       ├── clinics.service.ts        # Parameterized SQL CRUD for Clinics
│       ├── patient.service.ts        # Business logic & compliance orchestration
│       └── audit.service.ts          # Dual-persistence audit logger
├── presentation/
│   ├── modules/
│   │   ├── auth.module.ts            # High modularity: Auth module
│   │   ├── clinics.module.ts         # High modularity: Clinics module
│   │   └── patient.module.ts         # High modularity: Patient module
│   ├── controllers/
│   │   ├── auth.controller.ts        # /auth/register, /auth/login (rate limited), /auth/me
│   │   ├── clinics.controller.ts     # Full REST CRUD: POST, GET, PUT, DELETE /clinics
│   │   ├── patient.controller.ts     # Patient CRUD, Break-Glass, GDPR endpoints
│   │   └── health.controller.ts      # Continuous monitoring endpoint
│   ├── decorators/
│   │   ├── roles.decorator.ts        # RBAC decorator
│   │   └── current-user.decorator.ts # Context extraction decorator
│   ├── dto/
│   │   ├── register.dto.ts           # User registration validation DTO
│   │   ├── login.dto.ts              # Authentication DTO
│   │   ├── create-clinic.dto.ts      # Clinic creation DTO
│   │   ├── update-clinic.dto.ts      # Clinic update DTO
│   │   ├── create-patient.dto.ts     # Injection-proof validation DTO
│   │   ├── update-patient.dto.ts     # Demographic & clinical update DTO
│   │   └── break-glass.dto.ts        # Emergency bypass justification DTO
│   ├── guards/
│   │   ├── jwt-auth.guard.ts         # JWT route protection guard
│   │   └── roles.guard.ts            # RBAC & Break-Glass authorization guard
│   └── interceptors/
│       └── audit-log.interceptor.ts  # HIPAA & WORM audit interceptor
├── app.module.ts
└── main.ts
```

---

## 🎯 Scope Definition & Assessment Boundaries

To ensure absolute adherence to the assessment objectives and eliminate out-of-scope enterprise sprawl, the project enforces strict scope boundaries:

### ✅ Strictly IN SCOPE (Implemented & Verified)
1. **Authentication Security:**
   - Password hashing using `bcryptjs` with salt rounds $\ge 10$.
   - Zero plain-text password persistence; `password_hash` omitted from all API responses and domain entities (`UserEntity.toSafeUser()`).
   - Protected API endpoints requiring Bearer JWT authentication (`JwtAuthGuard`).
   - Granular Role-Based Access Control (`Doctor`, `Clerk`, `Admin`).
2. **API Security:**
   - Signed JSON Web Tokens (JWT) with configurable expiration (`JWT_EXPIRATION`, `JWT_SECRET`).
   - Context-binding authentication middleware (`RlsContextMiddleware`).
   - Protected routes with defense-in-depth guards (`JwtAuthGuard`, `RolesGuard`).
   - Sanitized responses stripping internal hashes, cryptokeys, and restricted clinical data.
3. **Database Security:**
   - 100% Parameterized SQL queries (`$1, $2, ...`) protecting against SQL Injection across all entities.
   - Least-privilege PostgreSQL database role (`secure_clinic_app`) restricted from DDL operations.
4. **Basic Rate Limiting:**
   - Dedicated brute-force rate limiting on `/auth/login` and `/auth/register` via `@nestjs/throttler` (default: 5 attempts per 15 minutes in production).
5. **API Expectations:**
   - **Auth Endpoints:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
   - **Clinics REST CRUD:** `POST /clinics`, `GET /clinics`, `GET /clinics/:id`, `PUT /clinics/:id`, `DELETE /clinics/:id`.
   - **Two Separate Clinics:** `Clinic A` and `Clinic B` isolated on shared PostgreSQL tables using Row-Level Security (RLS).
   - **High Modularity:** Dedicated NestJS feature modules (`AuthModule`, `ClinicsModule`, `PatientModule`, `DatabaseModule`, `CryptoModule`).
   - **Compliance:** Full coverage for GDPR (Access, Erasure), HIPAA (Encryption, Audit, Emergency Break-Glass), DPDPA 2023 (Consent locks), OWASP API Top 10 (Injection, BOLA, Rate Limit), and SOC 2 Type II (WORM audit chaining).

### ❌ OUT OF SCOPE (Intentionally Removed / Excluded)
- **Complex EHR Billing & Insurance Claims:** Heavy billing engines (ICD-10/CPT coding, clearinghouse EDI 837/835 transmissions) are out of scope.
- **Third-Party SSO/SAML/OAuth2 Federation:** Heavy enterprise identity providers (Okta, Auth0, PingFederate) are excluded in favor of standard, self-contained JWT authentication.
- **Frontend / Client UI:** Web interfaces (React, Next.js, Vue) are excluded; the deliverable is a pure, hardened REST API.
- **Payment Gateways & PCI-DSS Tokenizers:** Stripe, PayPal, and merchant processors are excluded.
- **Telehealth Video/Audio Infrastructure:** WebRTC signaling and media recording servers are excluded.

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and provide your credentials:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=secure_clinic_app
DB_PASSWORD=SecureClinicAppP@ssw0rd2024!
DB_NAME=secure_clinic_db
DB_SSL=false

# Migration admin credentials (used during npm run db:init)
DB_ADMIN_USER=postgres
DB_ADMIN_PASSWORD=your_postgres_password_here

# JWT Authentication
JWT_SECRET=super-secret-jwt-key-for-assessment-security-min-32-chars
JWT_EXPIRATION=86400s

# AES-256 Data Encryption Key (64 hex characters)
DATA_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

### 3. Database Schema Setup (PostgreSQL)
Executes schema DDL, creates `clinics`, `users`, `patients`, `audit_logs`, provisions RLS policies, and grants permissions:
```bash
npm run db:init
```

### 4. Seed Multi-Tenant Data & Security Simulation
Populates Clinic A, Clinic B, authenticated users (`Admin`, `Doctor`, `Clerk`), and encrypted patient records:
```bash
npm run seed
```

### 5. Running the Automated Compliance Test Suite
Executes the comprehensive test suite (29 tests across Auth, Clinics CRUD, Rate Limiting, RLS, and Compliance):
```bash
npm test
```

### 6. Starting the Backend Server
```bash
npm run start:dev
```

---

## 📡 Live API Testing Guide

### A. Authentication & User Endpoints (`/auth`)

#### 1. Register a New User
Hashes password using bcrypt ($\ge 10$ rounds) and strips `password_hash` from response:
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "doc_carter",
    "password": "StrongPassword123!",
    "role": "Doctor",
    "clinicId": "11111111-1111-1111-1111-111111111111"
  }'
```

#### 2. Login (Brute-Force Rate Limited)
Returns signed JWT token:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "doc_carter",
    "password": "StrongPassword123!"
  }'
```

#### 3. Current User Profile (`GET /auth/me`)
Requires Bearer JWT token; returns actor details with zero sensitive exposure:
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

### B. Clinics REST CRUD Endpoints (`/clinics`)

#### 1. List All Active Clinics
```bash
curl -X GET http://localhost:3000/clinics
```

#### 2. Get Clinic by ID
```bash
curl -X GET http://localhost:3000/clinics/11111111-1111-1111-1111-111111111111
```

#### 3. Create a New Clinic (Admin Only)
Protected by `JwtAuthGuard` + `RolesGuard`:
```bash
curl -X POST http://localhost:3000/clinics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -d '{
    "name": "Metro Health Specialty Center",
    "code": "METRO_SPEC"
  }'
```

#### 4. Update Clinic Details (Admin Only)
```bash
curl -X PUT http://localhost:3000/clinics/<CLINIC_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -d '{
    "name": "Metro Health Advanced Care Center"
  }'
```

#### 5. Soft-Delete Clinic (Admin Only)
```bash
curl -X DELETE http://localhost:3000/clinics/<CLINIC_ID> \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

---

### C. Multi-Tenant Patient & Compliance Endpoints (`/patients`)

Every request to tenant patient endpoints requires context headers or JWT simulating tenant boundaries:

| Header | Description | Values |
| :--- | :--- | :--- |
| `x-clinic-id` | Tenant Clinic UUID | `11111111-1111-1111-1111-111111111111` (Clinic A) or `22222222-2222-2222-2222-222222222222` (Clinic B) |
| `x-user-role` | User RBAC Role | `Doctor`, `Clerk`, or `Admin` |
| `x-user-id` | Unique Actor ID | e.g., `doc-sarah-101`, `clerk-john-202`, `admin-alice-001` |

#### 1. Health & Compliance Telemetry Check
```bash
curl -X GET http://localhost:3000/health
```

### 2. Create Patient as Doctor in Clinic A
```bash
curl -X POST http://localhost:3000/patients \
  -H "Content-Type: application/json" \
  -H "x-clinic-id: 11111111-1111-1111-1111-111111111111" \
  -H "x-user-role: Doctor" \
  -H "x-user-id: doc-sarah-101" \
  -d '{
    "name": "Bruce Banner",
    "nationalId": "NAT-44332211",
    "contactNumber": "+1-555-0100",
    "medicalNotes": "Radiation exposure monitoring. Heart rate elevated during stress.",
    "diagnosisCode": "T66.XXXA",
    "consentWithdrawn": false
  }'
```

### 3. List Patients in Clinic A (PostgreSQL RLS Filtered)
```bash
curl -X GET http://localhost:3000/patients \
  -H "x-clinic-id: 11111111-1111-1111-1111-111111111111" \
  -H "x-user-role: Doctor" \
  -H "x-user-id: doc-sarah-101"
```
*(Notice: Returns ONLY patients belonging to Clinic A. Patients from Clinic B are completely invisible).*

### 4. Verify Cross-Tenant Barrier (Doctor B accessing Clinic A)
Attempting to fetch a Clinic A patient using Clinic B headers will return `404 Not Found` (enforced at PostgreSQL kernel level via RLS):
```bash
curl -X GET http://localhost:3000/patients/<CLINIC_A_PATIENT_ID> \
  -H "x-clinic-id: 22222222-2222-2222-2222-222222222222" \
  -H "x-user-role: Doctor" \
  -H "x-user-id: doc-michael-303"
```

### 5. Clerk Least-Privilege Clinical Data Masking
Clerks can access demographics for billing/intake, but diagnostic notes are masked as `[RESTRICTED_CLINICAL_DATA]`:
```bash
curl -X GET http://localhost:3000/patients/<PATIENT_ID> \
  -H "x-clinic-id: 11111111-1111-1111-1111-111111111111" \
  -H "x-user-role: Clerk" \
  -H "x-user-id: clerk-john-202"
```

### 6. HIPAA Emergency Break-Glass Procedure (§ 164.312(a)(2)(ii))
Overrides consent barriers during life-safety emergency, generates a forensic session token, and records a high-priority WORM audit log:
```bash
curl -X POST http://localhost:3000/patients/<CONSENT_WITHDRAWN_PATIENT_ID>/break-glass \
  -H "Content-Type: application/json" \
  -H "x-clinic-id: 11111111-1111-1111-1111-111111111111" \
  -H "x-user-role: Doctor" \
  -H "x-user-id: doc-sarah-101" \
  -d '{
    "reason": "Acute cardiac arrest in emergency bay. Immediate patient history required.",
    "authorizedBy": "Dr. Sarah - Emergency Attending"
  }'
```

### 7. GDPR Article 15 Data Export (Admin Only)
```bash
curl -X GET http://localhost:3000/patients/<PATIENT_ID>/export \
  -H "x-clinic-id: 11111111-1111-1111-1111-111111111111" \
  -H "x-user-role: Admin" \
  -H "x-user-id: admin-alice-001"
```

### 8. GDPR Article 17 Cryptographic Erasure (Admin Only)
Irreversibly anonymizes direct identifiers and medical notes while preserving audit integrity:
```bash
curl -X POST http://localhost:3000/patients/<PATIENT_ID>/erase \
  -H "x-clinic-id: 11111111-1111-1111-1111-111111111111" \
  -H "x-user-role: Admin" \
  -H "x-user-id: admin-alice-001"
```
