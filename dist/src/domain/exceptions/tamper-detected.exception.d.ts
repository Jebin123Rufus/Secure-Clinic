import { HttpException } from '@nestjs/common';
export declare class TamperDetectedException extends HttpException {
    constructor(patientId: string, claimedHash: string, calculatedHash: string);
}
