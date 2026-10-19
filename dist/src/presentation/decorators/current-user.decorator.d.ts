import { SecurityContext } from '../../infrastructure/database/database.service';
export declare const CurrentSecurityContext: (...dataOrPipes: (keyof SecurityContext | import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | undefined)[]) => ParameterDecorator;
