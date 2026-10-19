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
var WormAuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WormAuditService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
let WormAuditService = WormAuditService_1 = class WormAuditService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(WormAuditService_1.name);
        this.latestHash = '0000000000000000000000000000000000000000000000000000000000000000';
        this.writeQueue = Promise.resolve();
    }
    onModuleInit() {
        const defaultPath = path.join(process.cwd(), 'storage', 'worm_audit_vault');
        this.storageDirectory = this.configService.get('WORM_STORAGE_PATH', defaultPath);
        this.vaultFilePath = path.join(this.storageDirectory, 'worm_audit_chain.jsonl');
        if (!fs.existsSync(this.storageDirectory)) {
            fs.mkdirSync(this.storageDirectory, { recursive: true });
        }
        this.recoverLatestHash();
        this.logger.log(`WORM Audit Vault initialized. Path: ${this.vaultFilePath}`);
    }
    async streamToWorm(entry) {
        return new Promise((resolve, reject) => {
            this.writeQueue = this.writeQueue
                .then(async () => {
                const previousHash = this.latestHash;
                const canonicalPayload = JSON.stringify({
                    id: entry.id,
                    clinicId: entry.clinicId,
                    userId: entry.userId,
                    userRole: entry.userRole,
                    action: entry.action,
                    resourceId: entry.resourceId,
                    clientIp: entry.clientIp,
                    statusCode: entry.statusCode,
                    isBreakGlass: entry.isBreakGlass,
                    breakGlassReason: entry.breakGlassReason,
                    timestamp: entry.timestamp,
                    previousHash,
                });
                const currentHash = crypto
                    .createHash('sha256')
                    .update(canonicalPayload, 'utf8')
                    .digest('hex');
                const wormRecord = {
                    ...entry,
                    previousHash,
                    hash: currentHash,
                };
                const line = JSON.stringify(wormRecord) + '\n';
                await fs.promises.appendFile(this.vaultFilePath, line, 'utf8');
                this.latestHash = currentHash;
                resolve(currentHash);
            })
                .catch((err) => {
                this.logger.error(`WORM write failed: ${err.message}`);
                reject(err);
            });
        });
    }
    async verifyVaultIntegrity() {
        if (!fs.existsSync(this.vaultFilePath)) {
            return { valid: true, totalRecords: 0 };
        }
        const lines = (await fs.promises.readFile(this.vaultFilePath, 'utf8'))
            .trim()
            .split('\n')
            .filter((l) => l.length > 0);
        let rollingHash = '0000000000000000000000000000000000000000000000000000000000000000';
        for (let i = 0; i < lines.length; i++) {
            const record = JSON.parse(lines[i]);
            if (record.previousHash !== rollingHash) {
                this.logger.error(`WORM Integrity Compromised at record index ${i}! Expected previous hash: ${rollingHash}, got: ${record.previousHash}`);
                return { valid: false, totalRecords: i };
            }
            const canonicalPayload = JSON.stringify({
                id: record.id,
                clinicId: record.clinicId,
                userId: record.userId,
                userRole: record.userRole,
                action: record.action,
                resourceId: record.resourceId,
                clientIp: record.clientIp,
                statusCode: record.statusCode,
                isBreakGlass: record.isBreakGlass,
                breakGlassReason: record.breakGlassReason,
                timestamp: record.timestamp,
                previousHash: record.previousHash,
            });
            const recalculated = crypto
                .createHash('sha256')
                .update(canonicalPayload, 'utf8')
                .digest('hex');
            if (recalculated !== record.hash) {
                this.logger.error(`WORM Record Tampering detected at record [${record.id}]. Digest mismatch.`);
                return { valid: false, totalRecords: i };
            }
            rollingHash = record.hash;
        }
        return { valid: true, totalRecords: lines.length };
    }
    recoverLatestHash() {
        if (!fs.existsSync(this.vaultFilePath))
            return;
        try {
            const content = fs.readFileSync(this.vaultFilePath, 'utf8').trim();
            if (!content)
                return;
            const lines = content.split('\n').filter((l) => l.length > 0);
            if (lines.length > 0) {
                const lastRecord = JSON.parse(lines[lines.length - 1]);
                this.latestHash = lastRecord.hash;
            }
        }
        catch (e) {
            this.logger.error(`Failed to recover latest WORM hash: ${e.message}`);
        }
    }
};
exports.WormAuditService = WormAuditService;
exports.WormAuditService = WormAuditService = WormAuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WormAuditService);
//# sourceMappingURL=worm-audit.service.js.map