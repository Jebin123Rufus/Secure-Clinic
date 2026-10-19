import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SecurityContext } from '../../infrastructure/database/database.service';

export const CurrentSecurityContext = createParamDecorator(
  (data: keyof SecurityContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const securityContext: SecurityContext = request.securityContext;

    if (!securityContext) {
      return null;
    }

    return data ? securityContext[data] : securityContext;
  },
);
