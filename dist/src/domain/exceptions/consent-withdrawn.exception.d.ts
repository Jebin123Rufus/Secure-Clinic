import { HttpException } from '@nestjs/common';
export declare class ConsentWithdrawnException extends HttpException {
    constructor(patientId: string);
}
