import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './infrastructure/database/database.module';
import { CryptoModule } from './infrastructure/crypto/crypto.module';
import { AuthModule } from './presentation/modules/auth.module';
import { ClinicsModule } from './presentation/modules/clinics.module';
import { PatientModule } from './presentation/modules/patient.module';
import { HealthController } from './presentation/controllers/health.controller';
import { RlsContextMiddleware } from './infrastructure/database/rls-context.middleware';

import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Root Application Module
 *
 * Implements:
 * - High Modularity: Feature modules (AuthModule, ClinicsModule, PatientModule, DatabaseModule, CryptoModule)
 * - Global Rate Limiting via ThrottlerModule and ThrottlerGuard to mitigate brute-force and resource exhaustion
 * - Multi-Tenant Row-Level Security Middleware binding across all tenant endpoints
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    CryptoModule,
    AuthModule,
    ClinicsModule,
    PatientModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RlsContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
