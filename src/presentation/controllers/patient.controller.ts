import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PatientService, DecryptedPatientDto } from '../../application/services/patient.service';
import { CreatePatientDto } from '../dto/create-patient.dto';
import { UpdatePatientDto } from '../dto/update-patient.dto';
import { BreakGlassDto } from '../dto/break-glass.dto';
import { RolesGuard } from '../guards/roles.guard';
import { AuditLogInterceptor } from '../interceptors/audit-log.interceptor';
import { Roles, AllowBreakGlass } from '../decorators/roles.decorator';
import { CurrentSecurityContext } from '../decorators/current-user.decorator';
import { SecurityContext } from '../../infrastructure/database/database.service';

/**
 * Enterprise Patient REST Presentation Controller
 *
 * Implements:
 * - Clean Architecture: Presentation layer isolated from domain and infrastructure.
 * - Access Control Matrix:
 *   - 'Doctor': Full CRUD on patient demographic and medical records.
 *   - 'Clerk': Restricted to demographic fields; medical diagnosis access/writes barred.
 *   - 'Admin': High-privilege GDPR Right of Access exports and Right to Erasure cryptographic scrubs.
 * - HIPAA (§ 164.312): Column encryption, automated audit interceptor, emergency break-glass.
 * - GDPR (Art 15, 17, 32) & DPDPA (Sec 6, 8, 11, 12): Mandatory consent verification and erasure.
 * - OWASP Top 10: Strict UUID parameter parsing, DTO whitelisting, audit logging.
 */
@Controller('patients')
@UseGuards(RolesGuard)
@UseInterceptors(AuditLogInterceptor)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  /**
   * 1. CREATE PATIENT RECORD
   * Accessible by: Doctor (full), Clerk (demographic only)
   */
  @Post()
  @Roles('Doctor', 'Clerk')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreatePatientDto,
    @CurrentSecurityContext() context: SecurityContext,
  ): Promise<DecryptedPatientDto> {
    return this.patientService.createPatient(createDto, context);
  }

  /**
   * 2. LIST ALL PATIENTS FOR CURRENT TENANT
   * Strictly isolated to the active tenant clinic via PostgreSQL RLS
   */
  @Get()
  @Roles('Doctor', 'Clerk', 'Admin')
  async findAll(
    @CurrentSecurityContext() context: SecurityContext,
  ): Promise<DecryptedPatientDto[]> {
    return this.patientService.getAllPatients(context);
  }

  /**
   * 3. GET SINGLE PATIENT RECORD
   * Enforces DPDPA Sec 6 consent check and HIPAA SHA-256 integrity verification.
   * Clerks receive masked clinical data.
   */
  @Get(':id')
  @Roles('Doctor', 'Clerk', 'Admin')
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentSecurityContext() context: SecurityContext,
  ): Promise<DecryptedPatientDto> {
    return this.patientService.getPatientById(id, context);
  }

  /**
   * 4. UPDATE PATIENT RECORD
   * Enforces DPDPA consent lock and role least-privilege boundary.
   */
  @Put(':id')
  @Roles('Doctor', 'Clerk')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDto: UpdatePatientDto,
    @CurrentSecurityContext() context: SecurityContext,
  ): Promise<DecryptedPatientDto> {
    return this.patientService.updatePatient(id, updateDto, context);
  }

  /**
   * 5. DELETE PATIENT RECORD
   * Restricted to Doctor or Admin within the tenant clinic.
   */
  @Delete(':id')
  @Roles('Doctor', 'Admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentSecurityContext() context: SecurityContext,
  ): Promise<void> {
    return this.patientService.deletePatient(id, context);
  }

  /**
   * 6. HIPAA § 164.312(a)(2)(ii) EMERGENCY BREAK-GLASS PROTOCOL
   * Bypasses standard tenant/consent barriers during life-safety incidents.
   * Generates high-priority WORM audit alert.
   */
  @Post(':id/break-glass')
  @Roles('Doctor', 'Admin')
  @AllowBreakGlass(true)
  @HttpCode(HttpStatus.OK)
  async breakGlass(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() breakGlassDto: BreakGlassDto,
    @CurrentSecurityContext() context: SecurityContext,
  ): Promise<{
    patient: DecryptedPatientDto;
    emergencySessionToken: string;
    notice: string;
  }> {
    return this.patientService.breakGlassAccess(id, breakGlassDto, context);
  }

  /**
   * 7. GDPR ARTICLE 15 / DPDPA SECTION 11 RIGHT OF ACCESS DATA EXPORT
   * Generates a complete decrypted structured JSON history for the patient.
   */
  @Get(':id/export')
  @Roles('Admin')
  async exportData(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentSecurityContext() context: SecurityContext,
  ): Promise<{
    exportTimestamp: string;
    complianceNotice: string;
    patientRecord: DecryptedPatientDto;
  }> {
    return this.patientService.exportPatientData(id, context);
  }

  /**
   * 8. GDPR ARTICLE 17 / DPDPA SECTION 12 RIGHT TO ERASURE (CRYPTOGRAPHIC SCRUBBING)
   * Irreversibly purges personal data and medical notes while preserving audit logs.
   */
  @Post(':id/erase')
  @Roles('Admin')
  @HttpCode(HttpStatus.OK)
  async eraseData(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentSecurityContext() context: SecurityContext,
  ): Promise<{
    patientId: string;
    status: string;
    complianceNotice: string;
  }> {
    return this.patientService.erasePatientData(id, context);
  }
}
