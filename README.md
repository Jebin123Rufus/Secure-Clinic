# SecureClinic: Production-Grade Healthcare Backend

A hardened, multi-tenant healthcare backend built with **NestJS**, **PostgreSQL Row-Level Security (RLS)**, and **Clean/Hexagonal Architecture**. Engineered to satisfy the regulatory compliance mandates of **HIPAA**, **SOC 2 Type II**, **GDPR**, **India DPDPA 2023**, and the **OWASP API Security Top 10**.

---

## Architecture & Compliance Matrix

| Compliance Mandate | Regulatory Section | Architectural Implementation in Codebase |
| :--- | :--- | :--- |
| **HIPAA** | § 164.312(a)(2)(i) Unique User Identification | Mandatory `x-user-id` context or JWT claims parsed and bound in `RlsContextMiddleware`. |
| **HIPAA** | § 164.312(a)(2)(ii) Emergency Access ("Break-Glass") | Dedicated `/patients/:id/break-glass` endpoint and `RolesGuard` override capturing clinician justification. |
| **HIPAA** | § 164.312(a)(2)(iv) Encryption at Rest | AES-256-GCM authenticated column-level encryption in `CryptoService` (`iv:authTag:ciphertext`). |
| **HIPAA** | § 164.312(b) Audit Controls | `AuditLogInterceptor` and `AuditService` capturing User ID, Action, Timestamp, Resource ID, IP, and Status. |
| **HIPAA** | § 164.312(c)(2) Mechanism to Authenticate PHI | SHA-256 record integrity hash (`record_hash`) validated on every read/write to detect DB tampering. |
| **SOC 2 Type II** | CC6.1 Logical Separation of Duties | Split migration role (`postgres`) and runtime connection role (`secure_clinic_app`). |
| **SOC 2 Type II** | CC6.6 Tenant Boundary Guardrails | Dynamic PostgreSQL Row-Level Security (`current_setting('app.current_clinic_id', true)`). |
| **SOC 2 Type II** | CC6.8 Immutable WORM Audit Vault | `WormAuditService` simulating S3 Object Lock via cryptographically chained SHA-256 hashes. |
| **SOC 2 Type II** | CC7.2 Continuous Monitoring | Telemetry endpoint at `/health` reporting database pool and WORM audit integrity status. |
| **GDPR / DPDPA** | GDPR Art. 15 / DPDPA Sec 11 Right of Access | One-click JSON data export endpoint `/patients/:id/export` providing complete data portability. |
| **GDPR / DPDPA** | GDPR Art. 17 / DPDPA Sec 12 Right to Erasure | Cryptographic scrubbing endpoint `/patients/:id/erase` purging PII while maintaining audit logs. |
| **GDPR / DPDPA** | GDPR Art. 32 Security of Processing | Pseudonymisation and isolation of direct identifiers (`name`, `nationalId`) from clinical notes. |
| **DPDPA 2023** | Section 6 Consent Conditionality | Hard barrier: All patient access blocked if `consent_withdrawn === true` unless break-glass token presented. |
| **OWASP API Top 10**| API1: Broken Object Level Auth (BOLA) | PostgreSQL Row-Level Security prevents IDOR cross-tenant access at the database engine level. |
| **OWASP API Top 10**| API2: Broken Authentication | Bcrypt password hashing ($\ge 10$ rounds), signed JWT tokens, and brute-force rate limiting. |
| **OWASP API Top 10**| API3: Broken Object Property Authorization| Clerks receive masked clinical data (`[RESTRICTED_CLINICAL_DATA]`) and cannot modify medical notes. |
| **OWASP API Top 10**| API4: Unrestricted Resource Consumption | Throttler middleware on `/auth/login` and `/auth/register` to prevent brute-force attacks. |
| **OWASP API Top 10**| API8: Security Misconfiguration | Helmet security headers, CORS origin enforcement, disabled `X-Powered-By` banner. |

---

## Exhaustive File-by-File Catalog

Every file in the repository serves a distinct security, architectural, or domain boundary:

### Root & Configuration Files
- **`package.json`**: Defines application metadata, runtime dependencies (`@nestjs/common`, `@nestjs/throttler`, `bcryptjs`, `jsonwebtoken`, `pg`, `helmet`, `class-validator`), dev dependencies, and npm scripts (`db:init`, `seed`, `build`, `test`, `start:dev`).
- **`tsconfig.json`**: TypeScript compiler configuration enforcing strict typing, decorator metadata, and module resolution.
- **`.env.example`**: Sanitized environment configuration template documenting all required keys (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_ADMIN_USER`, `DB_ADMIN_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION`, `DATA_ENCRYPTION_KEY`).
- **`.gitignore`**: Excludes build outputs (`dist/`), local environment secrets (`.env`), dependencies (`node_modules/`), runtime storage vaults (`storage/worm_audit_vault/*.jsonl`), and temporary logs.
- **`src/main.ts`**: Application entry point. Configures global validation pipes (`whitelist: true`, `forbidNonWhitelisted: true`), Helmet security headers, CORS policies, global filters, and boots the NestJS server.
- **`src/app.module.ts`**: Root application module orchestrating modular feature boundaries (`AuthModule`, `ClinicsModule`, `PatientModule`, `DatabaseModule`, `CryptoModule`), configuring the global `ThrottlerModule` (rate limiting), and binding `RlsContextMiddleware` across all routes.

### Database Layer (`src/database/`)
- **`src/database/schema.sql`**: Comprehensive PostgreSQL Data Definition Language (DDL) script. Creates tables (`clinics`, `users`, `patients`, `audit_logs`), enables Row-Level Security (RLS) on `patients`, defines tenant isolation policies, provisions the least-privilege `secure_clinic_app` role, and grants granular DML privileges.
- **`src/database/init-db.ts`**: Database migration execution script. Connects as admin (`postgres`), executes `schema.sql`, provisions database tables, and sets up initial roles.
- **`src/database/seed-simulation.ts`**: Database seeding and compliance simulation runner. Seeds Clinic A, Clinic B, authenticated users (`Admin`, `Doctor`, `Clerk`), inserts encrypted patient records, tests cross-tenant barriers, break-glass workflows, and verifies cryptographic WORM audit chains.

### Domain Layer (`src/domain/`)
- **`src/domain/entities/clinic.entity.ts`**: Domain entity representing a medical clinic tenant (`id`, `name`, `code`, `isActive`, `createdAt`, `updatedAt`).
- **`src/domain/entities/user.entity.ts`**: Domain entity representing an authenticated actor (`id`, `username`, `passwordHash`, `role`, `clinicId`). Features `toSafeUser()` to strip `passwordHash` before presentation.
- **`src/domain/entities/patient.entity.ts`**: Domain entity representing a protected patient record. Manages demographic fields, encrypted clinical fields, consent status, and integrity hashes.
- **`src/domain/entities/audit-log.entity.ts`**: Domain entity modeling immutable compliance audit entries (`id`, `timestamp`, `action`, `userId`, `userRole`, `clinicId`, `resourceId`, `ipAddress`, `status`, `details`).
- **`src/domain/exceptions/consent-withdrawn.exception.ts`**: Domain exception thrown when data access is attempted on a patient whose consent has been withdrawn under DPDPA 2023.
- **`src/domain/exceptions/tamper-detected.exception.ts`**: Domain exception raised when a record's SHA-256 digest fails verification, indicating unauthorized out-of-band database modification.
- **`src/domain/exceptions/break-glass-unauthorized.exception.ts`**: Domain exception thrown when emergency access is attempted without authorized clinical roles or missing justifications.

### Infrastructure Layer (`src/infrastructure/`)
- **`src/infrastructure/crypto/crypto.service.ts`**: Cryptographic core. Implements AES-256-GCM authenticated encryption/decryption with random 96-bit IVs and 128-bit auth tags, and computes SHA-256 digests for record integrity checks.
- **`src/infrastructure/crypto/crypto.module.ts`**: NestJS module exporting `CryptoService`.
- **`src/infrastructure/database/database.service.ts`**: Database connection pool manager. Implements parameterized query execution (`executeQuery`), transaction management, and sets PostgreSQL session variables (`app.current_clinic_id`, `app.current_user_id`) for Row-Level Security.
- **`src/infrastructure/database/database.module.ts`**: NestJS module exporting `DatabaseService`.
- **`src/infrastructure/database/rls-context.middleware.ts`**: Context extraction middleware. Inspects incoming headers (`x-clinic-id`, `x-user-role`, `x-user-id`) and Bearer JWT tokens, setting request context and tenant session settings.
- **`src/infrastructure/worm/worm-audit.service.ts`**: Write-Once-Read-Many (WORM) audit vault. Simulates hardware-locked immutable storage by maintaining a cryptographically chained JSONL hash vault where every block contains the hash of the preceding block.

### Application Layer (`src/application/services/`)
- **`src/application/services/auth.service.ts`**: Orchestrates user registration with bcrypt hashing ($\ge 10$ rounds), user credential validation, JWT token issuance, and authenticated profile retrieval.
- **`src/application/services/clinics.service.ts`**: Implements RESTful CRUD operations for clinics using strict parameterized SQL queries.
- **`src/application/services/patient.service.ts`**: Handles patient lifecycle operations, field-level encryption, role-based data masking, consent enforcement, emergency break-glass overrides, and GDPR export/erasure.
- **`src/application/services/audit.service.ts`**: Dual-persistence audit service recording compliance events to both the PostgreSQL database and the immutable WORM vault.

### Presentation Layer (`src/presentation/`)
- **Modules (`src/presentation/modules/`)**:
  - **`auth.module.ts`**: Encapsulates `AuthController` and `AuthService`.
  - **`clinics.module.ts`**: Encapsulates `ClinicsController` and `ClinicsService`.
  - **`patient.module.ts`**: Encapsulates `PatientController`, `PatientService`, and `AuditService`.
- **Controllers (`src/presentation/controllers/`)**:
  - **`auth.controller.ts`**: Exposes `/auth/register`, `/auth/login` (rate limited), and `/auth/me`.
  - **`clinics.controller.ts`**: Exposes `/clinics` REST CRUD endpoints (`GET`, `POST`, `PUT`, `DELETE`).
  - **`patient.controller.ts`**: Exposes `/patients` CRUD, `/break-glass`, `/export`, and `/erase`.
  - **`health.controller.ts`**: Exposes `/health` telemetry endpoint monitoring database health and WORM chain integrity.
- **Guards (`src/presentation/guards/`)**:
  - **`jwt-auth.guard.ts`**: Validates JWT Bearer tokens and attaches authenticated user context.
  - **`roles.guard.ts`**: Enforces Role-Based Access Control (`Doctor`, `Clerk`, `Admin`) and emergency break-glass permissions.
- **Interceptors & Decorators (`src/presentation/interceptors/`, `decorators/`)**:
  - **`audit-log.interceptor.ts`**: Global interceptor recording all incoming requests, actor identity, and response statuses into the audit trail.
  - **`roles.decorator.ts`**: Decorator specifying permitted roles on route handlers.
  - **`current-user.decorator.ts`**: Parameter decorator extracting authenticated user context from requests.
- **Data Transfer Objects (`src/presentation/dto/`)**:
  - **`register.dto.ts`**: Validates registration payloads with regex rules and UUID formatting.
  - **`login.dto.ts`**: Validates login credentials.
  - **`create-clinic.dto.ts`**: Validates clinic creation inputs.
  - **`update-clinic.dto.ts`**: Validates clinic update inputs.
  - **`create-patient.dto.ts`**: Validates patient demographic and medical inputs, enforcing injection-safe types.
  - **`update-patient.dto.ts`**: Validates patient update fields.
  - **`break-glass.dto.ts`**: Validates emergency access justification and authorizing clinician identity.

### Test Suites (`test/`)
- **`test/auth-clinics.spec.ts`**: 14 automated integration tests covering user registration, bcrypt password hashing, login, JWT issuance, rate limiting, and clinic REST CRUD operations.
- **`test/simulation.spec.ts`**: 15 automated integration tests validating multi-tenant RLS isolation, AES-256-GCM encryption, SHA-256 tamper detection, clerk data masking, DPDPA consent lock, HIPAA break-glass, GDPR export/erasure, and WORM vault integrity.

---

## Cryptographical Techniques Explained

### 1. AES-256-GCM Authenticated Column-Level Encryption
All Personally Identifiable Information (PII) and Protected Health Information (PHI) stored in `patients` (`contact_number`, `medical_notes`, `diagnosis_code`) are encrypted before database insertion using AES-256-GCM (Galois/Counter Mode).

- **Key Derivation:** A 256-bit (32-byte) symmetric key is supplied via `DATA_ENCRYPTION_KEY` in the environment.
- **Initialization Vector (IV):** A unique, cryptographically random 96-bit (12-byte) IV is generated for every single field encryption via `crypto.randomBytes(12)`. IV reuse is mathematically impossible.
- **Authentication Tag:** GCM mode computes a 128-bit (16-byte) authentication tag over the ciphertext. If any bit of the ciphertext or IV is altered in the database, decryption fails immediately with an authentication error.
- **Ciphertext Storage Format:** Fields are stored as a colon-delimited string:
  ```text
  <12-byte-hex-iv>:<16-byte-hex-auth-tag>:<hex-ciphertext>
  ```
  Example:
  ```text
  7a1f4b2c8901:3e5a7d9f1234567890abcdef12345678:8f2a1b94c03d...
  ```

### 2. SHA-256 Record Integrity Digests (`record_hash`)
To fulfill HIPAA § 164.312(c)(2) ("Mechanism to Authenticate Electronic Protected Health Information"), every patient record contains a canonical SHA-256 hash digest.

- **Hash Computation:** A SHA-256 digest is generated across canonicalized fields:
  ```text
  record_hash = SHA256(patientId + ":" + clinicId + ":" + nationalId + ":" + contactNumber + ":" + medicalNotes + ":" + diagnosisCode)
  ```
- **Tamper Detection:** When a record is fetched, the application recalculates the digest from the decrypted fields and compares it against `record_hash`. If an unauthorized administrator altered data directly via SQL, the digests will not match, and a `TamperDetectedException` is immediately raised.

### 3. WORM (Write Once, Read Many) Cryptographically Chained Vault
To fulfill SOC 2 Type II and HIPAA § 164.312(b) audit trail requirements, audit events are written to an append-only cryptographic ledger (`storage/worm_audit_vault/worm_audit_chain.jsonl`).

- **Block Structure:** Each log entry contains `index`, `timestamp`, `event`, `previousHash`, and `hash`.
- **Genesis Block:** The initial entry uses a constant zero-hash (`0000000000000000000000000000000000000000000000000000000000000000`).
- **Chained Hash Computation:**
  ```text
  hash = SHA256(index + ":" + timestamp + ":" + JSON.stringify(event) + ":" + previousHash)
  ```
- **Integrity Verification:** The `/health` endpoint and test suites recompute the hash chain from index 0 to the latest block. Any deletion, insertion, or retroactive alteration breaks the hash chain instantly.

### 4. Bcrypt Password Hashing
- Passwords are never stored in plaintext.
- Upon registration, `bcryptjs` generates a random salt with 10 work rounds (`bcrypt.genSalt(10)`).
- The resulting modular crypt format string (e.g., `$2b$10$...`) incorporates the algorithm identifier, cost factor, salt, and hash.
- Authentication compares credentials using constant-time verification (`bcrypt.compare`), mitigating timing attacks.

---

## How to View Encrypted Texts in the Database

You can inspect the raw database records directly in **pgAdmin 4** or via the **psql** terminal to verify that all sensitive data is encrypted at rest.

### Method A: Using pgAdmin 4
1. Open **pgAdmin 4** and connect to your PostgreSQL server.
2. Expand **Databases** > **`secure_clinic_db`** > **Schemas** > **public** > **Tables**.
3. Right-click on the **`patients`** table and select **View/Edit Data** > **All Rows** (or open the **Query Tool**).
4. Run the following query:
   ```sql
   SELECT 
       id, 
       name, 
       national_id, 
       contact_number, 
       medical_notes, 
       diagnosis_code, 
       record_hash, 
       created_at 
   FROM patients;
   ```

### Method B: Using `psql` Command Line
Open your terminal and run:
```bash
psql -U postgres -d secure_clinic_db
```
Execute the query:
```sql
SELECT id, name, contact_number, medical_notes, diagnosis_code FROM patients;
```

### What You Will See
The database returns values similar to:
```text
-[ RECORD 1 ]--+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
id             | 70000000-0000-0000-0000-000000000001
name           | Alice Smith
contact_number | 5a2c4e918b7f10d29c3e4a5b:81f7c20a9e3d4b5a6c7d8e9f0a1b2c3d:92c81d3f0a4b7e
medicalNotes   | 1b9e4a7c2d5f8e0a3b6c9d1e:4f9a0c3b8e7d6a5f1c2e3d4b5a6c7d8e:7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d
diagnosis_code | d3e5a7b9c1f2e4a6b8d0c2e4:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d:f5e4d3c2b1a0
record_hash    | 3a5f9b1c7e2d4a6f8b0c2e4a6d8f0b2c4e6a8d0f2b4c6e8a0d2f4b6c8e0a2d4f
```
Notice that:
- Direct identifiers and sensitive medical notes are stored as encrypted hex strings containing the IV, authentication tag, and ciphertext.
- If you inspect the `users` table:
  ```sql
  SELECT id, username, password_hash, role, clinic_id FROM users;
  ```
  The `password_hash` column contains exclusively salted bcrypt hashes starting with `$2b$10$...`.

---

## Setup, Seeding & Execution Guide

### Prerequisites
- **Node.js** (v18.x or v20.x recommended)
- **PostgreSQL** (v14, v15, or v18 running locally or on a network host)
- **pgAdmin 4** (optional, for visual DB inspection)

### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/Jebin123Rufus/Secure-Clinic.git
cd Secure-Clinic
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your credentials match your PostgreSQL instance:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=secure_clinic_app
DB_PASSWORD=SecureClinicAppP@ssw0rd2024!
DB_NAME=secure_clinic_db
DB_SSL=false

# Migration admin credentials (used exclusively by npm run db:init)
DB_ADMIN_USER=postgres
DB_ADMIN_PASSWORD=your_postgres_password_here

# JWT Authentication
JWT_SECRET=super-secret-jwt-key-for-assessment-security-min-32-chars
JWT_EXPIRATION=86400s

# AES-256 Data Encryption Key (64-character hex string = 256 bits)
DATA_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

### Step 3: Initialize Database Schema (DDL & RLS)
This command connects as the admin user (`postgres`), drops any old tables, provisions `clinics`, `users`, `patients`, `audit_logs`, creates the `secure_clinic_app` runtime user with restricted permissions, and enables PostgreSQL Row-Level Security:
```bash
npm run db:init
```

### Step 4: Seed Data & Run Compliance Simulation
Populates Clinic A, Clinic B, creates test accounts for Doctors, Clerks, and Admins, generates encrypted patient records, tests RLS barriers, and creates WORM audit records:
```bash
npm run seed
```

### Step 5: Run Automated Tests
Executes the comprehensive automated test suite (29 tests across unit and integration assertions):
```bash
npm test
```

### Step 6: Start the Backend Server
```bash
npm run start:dev
```
The server will boot on `http://localhost:3000`.

---

## Manual Testing Guide (Copy-Pastable for Postman & Burp Suite)

You can paste these raw HTTP requests directly into **Burp Suite Repeater** or configure them in **Postman**.

### 1. Register a New Doctor
```http
POST /auth/register HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "username": "dr_smith",
  "password": "Password123!",
  "role": "Doctor",
  "clinicId": "11111111-1111-1111-1111-111111111111"
}
```

### 2. Register a New Clerk
```http
POST /auth/register HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "username": "clerk_john",
  "password": "Password123!",
  "role": "Clerk",
  "clinicId": "11111111-1111-1111-1111-111111111111"
}
```

### 3. Login to Obtain JWT Token
```http
POST /auth/login HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "username": "dr_smith",
  "password": "Password123!"
}
```
*Expected Response (200 OK):*
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "dr_smith",
    "role": "Doctor",
    "clinicId": "11111111-1111-1111-1111-111111111111"
  }
}
```

### 4. Brute-Force Rate Limiting Verification
Send the login request above 6 consecutive times rapidly from the same IP.
*Expected Response on 6th Attempt (429 Too Many Requests):*
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

### 5. Get Authenticated User Profile (`GET /auth/me`)
```http
GET /auth/me HTTP/1.1
Host: localhost:3000
Authorization: Bearer <YOUR_JWT_TOKEN>
```

### 6. Create a New Clinic (Admin Only)
*Login as an Admin first (username: `admin_clinic_a`, password: `Password123!` seeded during `npm run seed`) to obtain an Admin JWT.*
```http
POST /clinics HTTP/1.1
Host: localhost:3000
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json

{
  "name": "St. Jude Specialized Care",
  "code": "ST_JUDE_01"
}
```

### 7. List All Clinics
```http
GET /clinics HTTP/1.1
Host: localhost:3000
```

### 8. Get Clinic by ID
```http
GET /clinics/11111111-1111-1111-1111-111111111111 HTTP/1.1
Host: localhost:3000
```

### 9. Update Clinic Details (Admin Only)
```http
PUT /clinics/11111111-1111-1111-1111-111111111111 HTTP/1.1
Host: localhost:3000
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json

{
  "name": "Clinic Alpha Premier Center"
}
```

### 10. Soft-Delete Clinic (Admin Only)
```http
DELETE /clinics/<CLINIC_ID> HTTP/1.1
Host: localhost:3000
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

### 11. Create a Patient Record in Clinic A (Doctor)
```http
POST /patients HTTP/1.1
Host: localhost:3000
Authorization: Bearer <DOCTOR_JWT_TOKEN>
Content-Type: application/json

{
  "name": "Robert Oppenheimer",
  "nationalId": "NAT-99887766",
  "contactNumber": "+1-555-0199",
  "medicalNotes": "Persistent insomnia and mild tremor. Blood test ordered.",
  "diagnosisCode": "G47.00",
  "consentWithdrawn": false
}
```

### 12. List Patients in Clinic A (Row-Level Security Filtered)
```http
GET /patients HTTP/1.1
Host: localhost:3000
Authorization: Bearer <DOCTOR_JWT_TOKEN>
```
*Notice: Only patients belonging to Clinic A are returned.*

### 13. Cross-Tenant Barrier Verification (BOLA / IDOR Prevention)
*Attempt to fetch Clinic A's patient using a token from a Doctor registered in Clinic B.*
```http
GET /patients/70000000-0000-0000-0000-000000000001 HTTP/1.1
Host: localhost:3000
Authorization: Bearer <CLINIC_B_DOCTOR_JWT_TOKEN>
```
*Expected Response (404 Not Found):*
```json
{
  "statusCode": 404,
  "message": "Patient not found or inaccessible"
}
```
*The PostgreSQL kernel RLS policy isolates data completely; the query executes as `0 rows returned`.*

### 14. Clerk Clinical Data Masking (Least-Privilege Enforcement)
*Login as a Clerk (`clerk_clinic_a`) and fetch a patient.*
```http
GET /patients/70000000-0000-0000-0000-000000000001 HTTP/1.1
Host: localhost:3000
Authorization: Bearer <CLERK_JWT_TOKEN>
```
*Expected Response:*
```json
{
  "id": "70000000-0000-0000-0000-000000000001",
  "name": "Alice Smith",
  "contactNumber": "+1-555-0101",
  "medicalNotes": "[RESTRICTED_CLINICAL_DATA]",
  "diagnosisCode": "[RESTRICTED]"
}
```

### 15. DPDPA Consent Hard Lock Verification
*Attempt to fetch a patient who has withdrawn consent (`consentWithdrawn: true`).*
```http
GET /patients/70000000-0000-0000-0000-000000000003 HTTP/1.1
Host: localhost:3000
Authorization: Bearer <DOCTOR_JWT_TOKEN>
```
*Expected Response (403 Forbidden):*
```json
{
  "statusCode": 403,
  "message": "Patient data processing is blocked under DPDPA Section 6: Consent has been formally withdrawn."
}
```

### 16. HIPAA Emergency Break-Glass Procedure (§ 164.312(a)(2)(ii))
*Override the consent barrier during a medical emergency.*
```http
POST /patients/70000000-0000-0000-0000-000000000003/break-glass HTTP/1.1
Host: localhost:3000
Authorization: Bearer <DOCTOR_JWT_TOKEN>
Content-Type: application/json

{
  "reason": "Anaphylactic shock following medication. Immediate allergy records required.",
  "authorizedBy": "Dr. Sarah - Emergency Attending"
}
```
*Expected Response (200 OK):*
```json
{
  "success": true,
  "breakGlassToken": "BG-FORENSIC-...",
  "unlockedPatient": {
    "id": "70000000-0000-0000-0000-000000000003",
    "name": "Charlie Brown",
    "medicalNotes": "Severe penicillin allergy. Previous episode of anaphylaxis in 2021."
  }
}
```
*A critical priority audit record is simultaneously appended to the WORM vault.*

### 17. GDPR Article 15 Data Portability Export (Admin Only)
```http
GET /patients/70000000-0000-0000-0000-000000000001/export HTTP/1.1
Host: localhost:3000
Authorization: Bearer <ADMIN_JWT_TOKEN>
```
*Returns a complete decrypted JSON dump of all demographic, medical, and audit trail interactions for the data subject.*

### 18. GDPR Article 17 Cryptographic Erasure (Admin Only)
```http
POST /patients/70000000-0000-0000-0000-000000000001/erase HTTP/1.1
Host: localhost:3000
Authorization: Bearer <ADMIN_JWT_TOKEN>
```
*Expected Response (200 OK):*
```json
{
  "success": true,
  "message": "Patient record cryptographically scrubbed under GDPR Art. 17 / DPDPA Sec 12. Direct identifiers permanently purged."
}
```

### 19. Continuous Monitoring Health & WORM Telemetry
```http
GET /health HTTP/1.1
Host: localhost:3000
```
*Expected Response (200 OK):*
```json
{
  "status": "HEALTHY",
  "database": "CONNECTED",
  "wormAuditVault": {
    "status": "VALID",
    "totalRecords": 8,
    "chainIntegrity": "VERIFIED_TAMPER_FREE"
  }
}
```
