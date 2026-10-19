import { ConfigService } from '@nestjs/config';
export declare class CryptoService {
    private readonly configService;
    private readonly logger;
    private readonly algorithm;
    private readonly ivLength;
    private readonly tagLength;
    private readonly masterKey;
    constructor(configService: ConfigService);
    encrypt(plaintext: string): string;
    decrypt(encryptedPayload: string): string;
    computeIntegrityHash(components: {
        clinicId: string;
        encryptedNationalId: string;
        diagnosisCode?: string;
        medicalNotes?: string;
    }): string;
    verifyIntegrity(claimedHash: string, components: {
        clinicId: string;
        encryptedNationalId: string;
        diagnosisCode?: string;
        medicalNotes?: string;
    }): boolean;
    generateSecureToken(bytes?: number): string;
}
