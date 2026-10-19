import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AuthModule } from './auth.module';
import { ClinicsService } from '../../application/services/clinics.service';
import { ClinicsController } from '../controllers/clinics.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ClinicsController],
  providers: [ClinicsService],
  exports: [ClinicsService],
})
export class ClinicsModule {}
