import { HttpException } from '@nestjs/common';
export declare class BreakGlassUnauthorizedException extends HttpException {
    constructor(message: string);
}
