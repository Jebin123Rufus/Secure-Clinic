import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ClinicsService } from '../../application/services/clinics.service';
import { CreateClinicDto } from '../dto/create-clinic.dto';
import { UpdateClinicDto } from '../dto/update-clinic.dto';
import { ClinicEntity } from '../../domain/entities/clinic.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

/**
 * Clinics Management REST Controller
 *
 * Implements:
 * - Simple CRUD to clinics with REST:
 *   - POST /clinics (Create clinic - Admin only)
 *   - GET /clinics (List all clinics)
 *   - GET /clinics/:id (Get single clinic)
 *   - PUT /clinics/:id (Update clinic - Admin only)
 *   - DELETE /clinics/:id (Soft-delete/deactivate clinic - Admin only)
 * - Protected routes with JWT Authentication & RBAC Authorization
 * - SQL parameterization preventing SQL injection (OWASP A03)
 */
@Controller('clinics')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  /**
   * Create a new clinic organization.
   * Protected: Admin role required.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @HttpCode(HttpStatus.CREATED)
  async createClinic(@Body() dto: CreateClinicDto): Promise<ClinicEntity> {
    return this.clinicsService.createClinic(dto);
  }

  /**
   * List all active clinics (e.g. Clinic A and Clinic B).
   */
  @Get()
  async getAllClinics(): Promise<ClinicEntity[]> {
    return this.clinicsService.getAllClinics();
  }

  /**
   * Retrieve clinic details by UUID.
   */
  @Get(':id')
  async getClinicById(@Param('id') id: string): Promise<ClinicEntity> {
    return this.clinicsService.getClinicById(id);
  }

  /**
   * Update an existing clinic.
   * Protected: Admin role required.
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async updateClinic(
    @Param('id') id: string,
    @Body() dto: UpdateClinicDto,
  ): Promise<ClinicEntity> {
    return this.clinicsService.updateClinic(id, dto);
  }

  /**
   * Deactivate a clinic organization.
   * Protected: Admin role required.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async deleteClinic(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.clinicsService.deleteClinic(id);
  }
}
