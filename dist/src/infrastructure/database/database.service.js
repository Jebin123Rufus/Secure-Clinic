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
var DatabaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const pg_1 = require("pg");
const async_hooks_1 = require("async_hooks");
let DatabaseService = DatabaseService_1 = class DatabaseService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(DatabaseService_1.name);
        this.isConnected = false;
        this.asyncLocalStorage = new async_hooks_1.AsyncLocalStorage();
        this.inMemoryPatients = new Map();
        this.inMemoryAuditLogs = [];
        this.inMemoryClinics = new Map();
        this.seedDefaultClinics();
    }
    async onModuleInit() {
        const host = this.configService.get('DB_HOST', 'localhost');
        const port = this.configService.get('DB_PORT', 5432);
        const user = this.configService.get('DB_USER', 'secure_clinic_app');
        const password = this.configService.get('DB_PASSWORD', 'SecureClinicAppP@ssw0rd2024!');
        const database = this.configService.get('DB_NAME', 'secure_clinic_db');
        const ssl = this.configService.get('DB_SSL', 'false') === 'true';
        this.pool = new pg_1.Pool({
            host,
            port,
            user,
            password,
            database,
            ssl: ssl ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        try {
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            this.isConnected = true;
            this.logger.log('Connected successfully to PostgreSQL database with RLS support.');
        }
        catch (err) {
            this.isConnected = false;
            this.logger.warn(`PostgreSQL server not detected at ${host}:${port}. Operating in Enterprise RLS Simulation Mode. (${err.message})`);
        }
    }
    async onModuleDestroy() {
        if (this.pool) {
            await this.pool.end();
        }
    }
    isDbConnected() {
        return this.isConnected;
    }
    async executeScopedQuery(queryText, params = [], contextOverride) {
        const context = contextOverride || this.asyncLocalStorage.getStore();
        if (!context || !context.clinicId) {
            throw new Error('RLS Security Violation: No tenant context found. app.current_clinic_id cannot be set.');
        }
        if (this.isConnected) {
            const client = await this.pool.connect();
            try {
                await client.query('BEGIN');
                await client.query(`SELECT set_config('app.current_clinic_id', $1, true);`, [context.clinicId]);
                if (context.isBreakGlass) {
                    await client.query(`SELECT set_config('app.is_break_glass', 'true', true);`);
                }
                const result = await client.query(queryText, params);
                await client.query('COMMIT');
                return result;
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        }
        else {
            return this.executeSimulatedQuery(queryText, params, context);
        }
    }
    async setRlsContextOnClient(client, context) {
        await client.query(`SELECT set_config('app.current_clinic_id', $1, true);`, [context.clinicId]);
        if (context.isBreakGlass) {
            await client.query(`SELECT set_config('app.is_break_glass', 'true', true);`);
        }
    }
    seedDefaultClinics() {
        this.inMemoryClinics.set('11111111-1111-1111-1111-111111111111', {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Clinic Alpha - Metro General',
            code: 'CLINIC_A',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        });
        this.inMemoryClinics.set('22222222-2222-2222-2222-222222222222', {
            id: '22222222-2222-2222-2222-222222222222',
            name: 'Clinic Beta - Valley Health',
            code: 'CLINIC_B',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        });
    }
    executeSimulatedQuery(queryText, params, context) {
        const trimmed = queryText.trim().toUpperCase();
        if (trimmed.startsWith('INSERT INTO PATIENTS')) {
            const id = params[0];
            const clinicId = params[1];
            const encryptedName = params[2];
            const encryptedNationalId = params[3];
            const encryptedContact = params[4];
            const medicalNotes = params[5];
            const diagnosisCode = params[6];
            const consentWithdrawn = params[7];
            const recordHash = params[8];
            if (clinicId !== context.clinicId) {
                throw new Error(`new row violates row-level security policy for table "patients" (Tenant Mismatch)`);
            }
            const row = {
                id,
                clinic_id: clinicId,
                encrypted_name: encryptedName,
                encrypted_national_id: encryptedNationalId,
                encrypted_contact: encryptedContact,
                medical_notes: medicalNotes,
                diagnosis_code: diagnosisCode,
                consent_withdrawn: consentWithdrawn,
                record_hash: recordHash,
                is_anonymized: false,
                anonymized_at: null,
                created_at: new Date(),
                updated_at: new Date(),
            };
            this.inMemoryPatients.set(id, row);
            return Promise.resolve({
                command: 'INSERT',
                rowCount: 1,
                oid: 0,
                fields: [],
                rows: [row],
            });
        }
        if (trimmed.includes('FROM PATIENTS WHERE ID = $1') || trimmed.includes('FROM PATIENTS WHERE ID=$1')) {
            const id = params[0];
            const record = this.inMemoryPatients.get(id);
            if (!record) {
                return Promise.resolve({
                    command: 'SELECT',
                    rowCount: 0,
                    oid: 0,
                    fields: [],
                    rows: [],
                });
            }
            if (record.clinic_id !== context.clinicId && !context.isBreakGlass) {
                return Promise.resolve({
                    command: 'SELECT',
                    rowCount: 0,
                    oid: 0,
                    fields: [],
                    rows: [],
                });
            }
            return Promise.resolve({
                command: 'SELECT',
                rowCount: 1,
                oid: 0,
                fields: [],
                rows: [record],
            });
        }
        if (trimmed.startsWith('SELECT') && trimmed.includes('FROM PATIENTS')) {
            const records = Array.from(this.inMemoryPatients.values()).filter((p) => {
                if (context.isBreakGlass)
                    return true;
                return p.clinic_id === context.clinicId;
            });
            return Promise.resolve({
                command: 'SELECT',
                rowCount: records.length,
                oid: 0,
                fields: [],
                rows: records,
            });
        }
        if (trimmed.startsWith('UPDATE PATIENTS')) {
            const id = params[params.length - 1];
            const existing = this.inMemoryPatients.get(id);
            if (!existing || (existing.clinic_id !== context.clinicId && !context.isBreakGlass)) {
                return Promise.resolve({
                    command: 'UPDATE',
                    rowCount: 0,
                    oid: 0,
                    fields: [],
                    rows: [],
                });
            }
            if (trimmed.includes('IS_ANONYMIZED = TRUE')) {
                existing.encrypted_name = 'ANONYMIZED_PURGED';
                existing.encrypted_national_id = 'ANONYMIZED_PURGED';
                existing.encrypted_contact = 'ANONYMIZED_PURGED';
                existing.medical_notes = null;
                existing.diagnosis_code = null;
                existing.record_hash = '0000000000000000000000000000000000000000000000000000000000000000';
                existing.is_anonymized = true;
                existing.anonymized_at = new Date();
                existing.updated_at = new Date();
            }
            else {
                existing.encrypted_name = params[0];
                existing.encrypted_contact = params[1];
                existing.medical_notes = params[2];
                existing.diagnosis_code = params[3];
                existing.consent_withdrawn = params[4];
                existing.record_hash = params[5];
                existing.updated_at = new Date();
            }
            this.inMemoryPatients.set(id, existing);
            return Promise.resolve({
                command: 'UPDATE',
                rowCount: 1,
                oid: 0,
                fields: [],
                rows: [existing],
            });
        }
        if (trimmed.startsWith('DELETE FROM PATIENTS')) {
            const id = params[0];
            const existing = this.inMemoryPatients.get(id);
            if (!existing || (existing.clinic_id !== context.clinicId && !context.isBreakGlass)) {
                return Promise.resolve({
                    command: 'DELETE',
                    rowCount: 0,
                    oid: 0,
                    fields: [],
                    rows: [],
                });
            }
            this.inMemoryPatients.delete(id);
            return Promise.resolve({
                command: 'DELETE',
                rowCount: 1,
                oid: 0,
                fields: [],
                rows: [existing],
            });
        }
        if (trimmed.startsWith('INSERT INTO AUDIT_LOGS')) {
            const logEntry = {
                id: params[0],
                clinic_id: params[1],
                user_id: params[2],
                user_role: params[3],
                action: params[4],
                resource_id: params[5],
                client_ip: params[6],
                status_code: params[7],
                is_break_glass: params[8],
                break_glass_reason: params[9],
                worm_archive_hash: params[10],
                details: params[11],
                timestamp: new Date(),
            };
            this.inMemoryAuditLogs.push(logEntry);
            return Promise.resolve({
                command: 'INSERT',
                rowCount: 1,
                oid: 0,
                fields: [],
                rows: [logEntry],
            });
        }
        if (trimmed.includes('FROM AUDIT_LOGS')) {
            const logs = this.inMemoryAuditLogs.filter((l) => l.clinic_id === context.clinicId || context.isBreakGlass);
            return Promise.resolve({
                command: 'SELECT',
                rowCount: logs.length,
                oid: 0,
                fields: [],
                rows: logs,
            });
        }
        return Promise.resolve({
            command: 'SELECT',
            rowCount: 0,
            oid: 0,
            fields: [],
            rows: [],
        });
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = DatabaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DatabaseService);
//# sourceMappingURL=database.service.js.map