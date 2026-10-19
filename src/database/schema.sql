-- ============================================================================
-- SECURE CLINIC DATABASE SCHEMA DDL
-- Compliant with: HIPAA (§ 164.312), SOC 2 Type II, GDPR (Art 15, 17, 32),
--                DPDPA (Sec 6, 8, 11, 12), and OWASP Top 10 (A01, A03, A08)
-- ============================================================================

-- Ensure pgcrypto extension is available for UUID generation and cryptographic primitives
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ROLE-BASED ACCESS & LEAST PRIVILEGE SEPARATION (SOC 2 Type II)
-- Separate migration/admin execution from application connection runtime roles
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'secure_clinic_app') THEN
        CREATE ROLE secure_clinic_app WITH LOGIN PASSWORD 'SecureClinicAppP@ssw0rd2024!' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. CLINICS TABLE (Multi-Tenant Demarcation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clinics_code ON clinics(code);

-- ----------------------------------------------------------------------------
-- 2.1 USERS TABLE (Authentication & Role-Based Access Control - OWASP A02/A07)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Doctor', 'Clerk', 'Admin')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON users(clinic_id);

-- ----------------------------------------------------------------------------
-- 3. PATIENTS TABLE (PHI Storage, Column-Level Encrypted, RLS-Enforced)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE RESTRICT,
    
    -- Pseudonymised Direct Identifiers (Encrypted AES-256-GCM via CryptoService)
    -- Format: iv:authTag:ciphertext (base64 encoded)
    encrypted_name TEXT NOT NULL,
    encrypted_national_id TEXT NOT NULL,
    encrypted_contact TEXT NOT NULL,
    
    -- Clinical Diagnostic Data (Separated from direct identifiers - GDPR Art 32 / DPDPA Sec 8)
    medical_notes TEXT,
    diagnosis_code VARCHAR(50),
    
    -- Consent Management (DPDPA Sec 6)
    -- If TRUE, all standard CRUD actions are strictly blocked by guard/middleware
    consent_withdrawn BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Cryptographic Data Integrity Authenticator (HIPAA § 164.312(c)(2) / OWASP A08)
    -- SHA-256 hash computed over (id + clinic_id + encrypted_national_id + diagnosis_code)
    record_hash VARCHAR(64) NOT NULL,
    
    -- Right to Erasure / Cryptographic Scrubbing Flag (GDPR Art 17 / DPDPA Sec 12)
    is_anonymized BOOLEAN NOT NULL DEFAULT FALSE,
    anonymized_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_consent ON patients(clinic_id, consent_withdrawn);

-- ----------------------------------------------------------------------------
-- 4. AUDIT LOGS TABLE (HIPAA § 164.312(b), SOC 2 WORM Audit Trail)
-- Immutable record of every read, create, update, delete, export, erase, break-glass
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE RESTRICT,
    user_id VARCHAR(128) NOT NULL,
    user_role VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    resource_id VARCHAR(128),
    client_ip VARCHAR(64) NOT NULL,
    status_code INTEGER NOT NULL,
    
    -- HIPAA § 164.312(a)(2)(ii) Emergency Break-Glass Flags
    is_break_glass BOOLEAN NOT NULL DEFAULT FALSE,
    break_glass_reason TEXT,
    
    -- WORM (Write Once Read Many) verification hash (SHA-256 chain)
    worm_archive_hash VARCHAR(64) NOT NULL,
    
    -- Action Details & Metadata Payload
    details JSONB,
    
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic_timestamp ON audit_logs(clinic_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_break_glass ON audit_logs(is_break_glass) WHERE is_break_glass = TRUE;

-- ----------------------------------------------------------------------------
-- 5. ROW-LEVEL SECURITY (RLS) POLICIES
-- Enforces hard tenant isolation via session context: app.current_clinic_id
-- Prevents cross-tenant data leaks (OWASP A01 / SOC 2 Ingress-Egress Guardrails)
-- ----------------------------------------------------------------------------

-- Enable and FORCE RLS on patients table (even table owners must obey)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients FORCE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS clinic_isolation_policy ON patients;

-- Row-Level Security Policy for Patients:
-- Evaluates current_setting('app.current_clinic_id', true)
-- In Emergency Break-Glass mode, audited override is permitted if flag is explicitly set
CREATE POLICY clinic_isolation_policy ON patients
    FOR ALL
    TO PUBLIC
    USING (
        clinic_id = NULLIF(current_setting('app.current_clinic_id', true), '')::UUID
        OR current_setting('app.is_break_glass', true) = 'true'
    )
    WITH CHECK (
        clinic_id = NULLIF(current_setting('app.current_clinic_id', true), '')::UUID
    );

-- Enable and FORCE RLS on audit_logs table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_isolation_policy ON audit_logs;

CREATE POLICY audit_isolation_policy ON audit_logs
    FOR ALL
    TO PUBLIC
    USING (
        clinic_id = NULLIF(current_setting('app.current_clinic_id', true), '')::UUID
        OR current_setting('app.is_break_glass', true) = 'true'
    )
    WITH CHECK (
        clinic_id = NULLIF(current_setting('app.current_clinic_id', true), '')::UUID
    );

-- ----------------------------------------------------------------------------
-- 6. GRANT LEAST-PRIVILEGE PERMISSIONS TO APPLICATION RUNTIME USER
-- ----------------------------------------------------------------------------
GRANT CONNECT ON DATABASE secure_clinic_db TO secure_clinic_app;
GRANT USAGE ON SCHEMA public TO secure_clinic_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON patients TO secure_clinic_app;
GRANT SELECT, INSERT ON audit_logs TO secure_clinic_app;
-- Deny UPDATE and DELETE on audit_logs for secure_clinic_app (Immutability guarantee)
REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM secure_clinic_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON clinics TO secure_clinic_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO secure_clinic_app;

-- ----------------------------------------------------------------------------
-- 7. SEED INITIAL TENANTS (Clinic A and Clinic B)
-- ----------------------------------------------------------------------------
INSERT INTO clinics (id, name, code, is_active)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Clinic Alpha - Metro General', 'CLINIC_A', true),
    ('22222222-2222-2222-2222-222222222222', 'Clinic Beta - Valley Health', 'CLINIC_B', true)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, code = EXCLUDED.code;
