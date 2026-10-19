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
var CryptoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = require("crypto");
let CryptoService = CryptoService_1 = class CryptoService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(CryptoService_1.name);
        this.algorithm = 'aes-256-gcm';
        this.ivLength = 12;
        this.tagLength = 16;
        const rawKey = this.configService.get('DATA_ENCRYPTION_KEY', '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
        if (rawKey.length === 64) {
            this.masterKey = Buffer.from(rawKey, 'hex');
        }
        else if (rawKey.length === 32) {
            this.masterKey = Buffer.from(rawKey, 'utf-8');
        }
        else {
            this.logger.warn('DATA_ENCRYPTION_KEY must be a 32-byte hex string (64 characters) or 32-byte UTF-8 string. Deriving fallback with SHA-256.');
            this.masterKey = crypto.createHash('sha256').update(rawKey).digest();
        }
    }
    encrypt(plaintext) {
        if (!plaintext) {
            return '';
        }
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv, {
            authTagLength: this.tagLength,
        });
        const encrypted = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final(),
        ]);
        const authTag = cipher.getAuthTag();
        return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
    }
    decrypt(encryptedPayload) {
        if (!encryptedPayload) {
            return '';
        }
        const parts = encryptedPayload.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted payload format. Expected "iv:authTag:ciphertext".');
        }
        const [ivB64, tagB64, ciphertextB64] = parts;
        const iv = Buffer.from(ivB64, 'base64');
        const authTag = Buffer.from(tagB64, 'base64');
        const ciphertext = Buffer.from(ciphertextB64, 'base64');
        if (iv.length !== this.ivLength || authTag.length !== this.tagLength) {
            throw new Error('Malformed IV or Authentication Tag length in payload.');
        }
        const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv, {
            authTagLength: this.tagLength,
        });
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([
            decipher.update(ciphertext),
            decipher.final(),
        ]);
        return decrypted.toString('utf8');
    }
    computeIntegrityHash(components) {
        const canonicalString = [
            components.clinicId || '',
            components.encryptedNationalId || '',
            components.diagnosisCode || '',
            components.medicalNotes || '',
        ].join('|#|');
        return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
    }
    verifyIntegrity(claimedHash, components) {
        const computed = this.computeIntegrityHash(components);
        return crypto.timingSafeEqual(Buffer.from(claimedHash, 'hex'), Buffer.from(computed, 'hex'));
    }
    generateSecureToken(bytes = 32) {
        return crypto.randomBytes(bytes).toString('hex');
    }
};
exports.CryptoService = CryptoService;
exports.CryptoService = CryptoService = CryptoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CryptoService);
//# sourceMappingURL=crypto.service.js.map