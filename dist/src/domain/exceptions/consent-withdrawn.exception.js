"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentWithdrawnException = void 0;
const common_1 = require("@nestjs/common");
class ConsentWithdrawnException extends common_1.HttpException {
    constructor(patientId) {
        super({
            statusCode: common_1.HttpStatus.FORBIDDEN,
            error: 'ConsentWithdrawn',
            message: `CRUD operations are blocked: Patient [${patientId}] has actively withdrawn consent under DPDPA Sec 6 / GDPR Art 7.`,
            patientId,
            legalNotice: 'Under DPDPA 2023 Sec 6, data fiduciaries must cease processing personal data upon withdrawal of consent unless explicitly overridden by emergency medical protocols.',
        }, common_1.HttpStatus.FORBIDDEN);
    }
}
exports.ConsentWithdrawnException = ConsentWithdrawnException;
//# sourceMappingURL=consent-withdrawn.exception.js.map