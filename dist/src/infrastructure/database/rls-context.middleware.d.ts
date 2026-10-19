import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DatabaseService, SecurityContext } from './database.service';
export interface RequestWithSecurityContext extends Request {
    securityContext: SecurityContext;
}
export declare class RlsContextMiddleware implements NestMiddleware {
    private readonly databaseService;
    private readonly logger;
    constructor(databaseService: DatabaseService);
    use(req: Request, res: Response, next: NextFunction): void;
}
