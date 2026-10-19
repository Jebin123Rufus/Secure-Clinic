import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CryptoModule } from './infrastructure/crypto/crypto.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { WormAuditService } from './infrastructure/worm/worm-audit.service';
import { AuditService } from './application/services/audit.service';
import { PatientService } from './application/services/patient.service';
import { PatientController } from './presentation/controllers/patient.controller';
import { HealthController } from './presentation/controllers/health.controller';
import { RlsContextMiddleware } from './infrastructure/database/rls-context.middleware';
import { RolesGuard } from './presentation/guards/roles.guard';
import { AuditLogInterceptor } from './presentation/interceptors/audit-log.interceptor';

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
    CryptoModule,
    DatabaseModule,
  ],
  controllers: [HealthController, PatientController],
  providers: [
    WormAuditService,
    AuditService,
    PatientService,
    RolesGuard,
    AuditLogInterceptor,
  ],
  exports: [WormAuditService, AuditService, PatientService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply RlsContextMiddleware across all application routes
    // Exempts /health natively inside middleware
    consumer
      .apply(RlsContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
