import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { ClinicEntity } from '../../domain/entities/clinic.entity';
import { CreateClinicDto } from '../../presentation/dto/create-clinic.dto';
import { UpdateClinicDto } from '../../presentation/dto/update-clinic.dto';

/**
 * Clinics Management Service
 *
 * Implements:
 * - Simple CRUD to clinics with REST
 * - Demarcation of separate isolated healthcare clinics (e.g. Clinic A and Clinic B)
 * - Strict SQL parameterization preventing SQL injection (OWASP A03)
 */
@Injectable()
export class ClinicsService {
  private readonly logger = new Logger(ClinicsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Creates a new clinic tenant organization.
   */
  async createClinic(dto: CreateClinicDto): Promise<ClinicEntity> {
    const existing = await this.databaseService.executeQuery(
      'SELECT id FROM clinics WHERE UPPER(code) = UPPER($1) LIMIT 1;',
      [dto.code.trim()],
    );

    if (existing.rows.length > 0) {
      throw new ConflictException(`Clinic with code "${dto.code}" already exists.`);
    }

    const clinicId = uuidv4();
    const query = `
      INSERT INTO clinics (id, name, code, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const result = await this.databaseService.executeQuery(query, [
      clinicId,
      dto.name.trim(),
      dto.code.trim().toUpperCase(),
    ]);

    const entity = ClinicEntity.fromRow(result.rows[0]);
    this.logger.log(`Created new clinic: ${entity.name} (${entity.code}) [${entity.id}]`);
    return entity;
  }

  /**
   * Retrieves all active clinic organizations.
   */
  async getAllClinics(): Promise<ClinicEntity[]> {
    const result = await this.databaseService.executeQuery(
      'SELECT * FROM clinics WHERE is_active = true ORDER BY name ASC;',
      [],
    );

    return result.rows.map((row) => ClinicEntity.fromRow(row));
  }

  /**
   * Retrieves a single clinic organization by UUID.
   */
  async getClinicById(id: string): Promise<ClinicEntity> {
    const result = await this.databaseService.executeQuery(
      'SELECT * FROM clinics WHERE id = $1 LIMIT 1;',
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Clinic with ID "${id}" was not found.`);
    }

    return ClinicEntity.fromRow(result.rows[0]);
  }

  /**
   * Updates an existing clinic.
   */
  async updateClinic(id: string, dto: UpdateClinicDto): Promise<ClinicEntity> {
    // Verify existence
    await this.getClinicById(id);

    if (dto.code) {
      const existing = await this.databaseService.executeQuery(
        'SELECT id FROM clinics WHERE UPPER(code) = UPPER($1) AND id <> $2 LIMIT 1;',
        [dto.code.trim(), id],
      );
      if (existing.rows.length > 0) {
        throw new ConflictException(`Clinic with code "${dto.code}" is already in use.`);
      }
    }

    const updateQuery = `
      UPDATE clinics
      SET name = COALESCE($1, name),
          code = COALESCE($2, code),
          is_active = COALESCE($3, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;

    const result = await this.databaseService.executeQuery(updateQuery, [
      dto.name ? dto.name.trim() : null,
      dto.code ? dto.code.trim().toUpperCase() : null,
      dto.isActive !== undefined ? dto.isActive : null,
      id,
    ]);

    return ClinicEntity.fromRow(result.rows[0]);
  }

  /**
   * Deactivates a clinic organization (soft delete).
   */
  async deleteClinic(id: string): Promise<{ success: boolean; message: string }> {
    await this.getClinicById(id);

    await this.databaseService.executeQuery(
      'UPDATE clinics SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1;',
      [id],
    );

    this.logger.log(`Clinic ${id} deactivated.`);
    return {
      success: true,
      message: `Clinic "${id}" deactivated successfully.`,
    };
  }
}
