import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { CryptoModule } from '../../infrastructure/crypto/crypto.module';
import { AuthModule } from './auth.module';
import { PatientService } from '../../application/services/patient.service';
import { AuditService } from '../../application/services/audit.service';
import { WormAuditService } from '../../infrastructure/worm/worm-audit.service';
import { PatientController } from '../controllers/patient.controller';
import { RolesGuard } from '../guards/roles.guard';
import { AuditLogInterceptor } from '../interceptors/audit-log.interceptor';

@Module({
  imports: [DatabaseModule, CryptoModule, AuthModule],
  controllers: [PatientController],
  providers: [
    PatientService,
    AuditService,
    WormAuditService,
    RolesGuard,
    AuditLogInterceptor,
  ],
  exports: [PatientService, AuditService, WormAuditService],
})
export class PatientModule {}
