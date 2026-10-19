# 🛡️ SecureClinic: Production-Grade Healthcare Backend

A hardened, multi-tenant healthcare backend simulation template built with **NestJS**, **PostgreSQL Row-Level Security (RLS)**, and **Clean/Hexagonal Architecture**. Engineered to satisfy the rigorous compliance mandates of **HIPAA**, **SOC 2 Type II**, **GDPR**, **India DPDPA 2023**, and the **OWASP Top 10**.

---

## 🏛️ Architecture & Compliance Matrix

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

| Operation | Endpoint | Doctor | Clerk | Admin | Notes |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Create Patient** | `POST /patients` | ✅ | ✅ (Demographics only) | ❌ | Clerks cannot provide `medicalNotes` or `diagnosisCode`. |
| **List Patients** | `GET /patients` | ✅ | ✅ (Masked notes) | ✅ | Enforced strictly to tenant via PostgreSQL RLS. |
| **Get Patient** | `GET /patients/:id` | ✅ | ✅ (Masked notes) | ✅ | Blocks if `consent_withdrawn === true` (DPDPA Sec 6). |
| **Update Patient** | `PUT /patients/:id` | ✅ | ✅ (Demographics only) | ❌ | Clerks rejected if updating medical fields. |
| **Delete Patient** | `DELETE /patients/:id` | ✅ | ❌ | ✅ | Isolated to tenant. |
| **Break-Glass** | `POST /patients/:id/break-glass` | ✅ | ❌ | ✅ | Emergency bypass with high-priority WORM alert. |
| **GDPR Export** | `GET /patients/:id/export` | ❌ | ❌ | ✅ | Full decrypted patient history. |
| **GDPR Erasure** | `POST /patients/:id/erase` | ❌ | ❌ | ✅ | Unrecoverable cryptographic purge. |

---

## 📁 Repository Structure

```
src/
├── database/
│   ├── schema.sql                    # PostgreSQL DDL with RLS Policies & Grants
│   └── init-db.ts                    # Migration script
├── domain/
│   ├── entities/
│   │   ├── patient.entity.ts         # Clean domain entity
│   │   ├── clinic.entity.ts          # Tenant entity
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
│   │   ├── database.service.ts       # Pool manager & RLS transaction executor
│   │   ├── database.module.ts
│   │   └── rls-context.middleware.ts # RLS context header extraction & scoping
│   └── worm/
│       └── worm-audit.service.ts     # Immutable WORM append-only hash vault
├── application/
│   └── services/
│       ├── patient.service.ts        # Business logic & compliance orchestration
│       └── audit.service.ts          # Dual-persistence audit logger
├── presentation/
│   ├── controllers/
│   │   ├── patient.controller.ts     # Patient CRUD, Break-Glass, GDPR endpoints
│   │   └── health.controller.ts      # Continuous monitoring endpoint
│   ├── decorators/
│   │   ├── roles.decorator.ts        # RBAC decorator
│   │   └── current-user.decorator.ts # Context extraction decorator
│   ├── dto/
│   │   ├── create-patient.dto.ts     # Injection-proof validation DTO
│   │   ├── update-patient.dto.ts     # Demographic & clinical update DTO
│   │   └── break-glass.dto.ts        # Emergency bypass justification DTO
│   ├── guards/
│   │   └── roles.guard.ts            # RBAC & Break-Glass authorization guard
│   └── interceptors/
│       └── audit-log.interceptor.ts  # HIPAA & WORM audit interceptor
├── app.module.ts
└── main.ts
```

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=secure_clinic_app
DB_PASSWORD=SecureClinicAppP@ssw0rd2024!
DB_NAME=secure_clinic_db
DATA_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

### 3. Database Schema Setup (PostgreSQL)
```bash
npm run db:init
```

### 4. Running the Tests
Executes the compliance test suite (15 assertions verifying cross-tenant RLS isolation, RBAC matrix, DPDPA consent lock, Break-Glass bypass, GDPR export/erase, and WORM audit integrity):
```bash
npm test
```

### 5. Running the Application
```bash
npm run start:dev
```
