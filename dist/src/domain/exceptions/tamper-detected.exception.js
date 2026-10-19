"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TamperDetectedException = void 0;
const common_1 = require("@nestjs/common");
class TamperDetectedException extends common_1.HttpException {
    constructor(patientId, claimedHash, calculatedHash) {
        super({
            statusCode: common_1.HttpStatus.CONFLICT,
            error: 'DataIntegrityFailure',
            message: `Cryptographic tamper detected for Patient [${patientId}]. Record hash verification failed.`,
            patientId,
            securityViolation: 'SHA-256 integrity hash does not match computed payload digest. Potential unauthorized database modification.',
            claimedHash,
            calculatedHash,
        }, common_1.HttpStatus.CONFLICT);
    }
}
exports.TamperDetectedException = TamperDetectedException;
//# sourceMappingURL=tamper-detected.exception.js.map