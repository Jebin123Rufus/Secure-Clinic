import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { WormAuditService } from '../../infrastructure/worm/worm-audit.service';

/**
 * Health & Continuous Monitoring Controller
 *
 * Implements:
 * - SOC 2 Type II: Continuous Monitoring & Telemetry (CC7.2)
 * - Evaluates database connectivity, WORM audit chain integrity, and system uptime
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly wormAuditService: WormAuditService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check() {
    const isDbUp = this.databaseService.isDbConnected();
    const wormStatus = await this.wormAuditService.verifyVaultIntegrity();

    return {
      status: isDbUp && wormStatus.valid ? 'HEALTHY' : 'DEGRADED',
      database: isDbUp ? 'CONNECTED' : 'SIMULATION_FALLBACK',
      wormAuditVault: {
        status: wormStatus.valid ? 'VALID' : 'TAMPERED',
        totalRecords: wormStatus.totalRecords,
        chainIntegrity: wormStatus.valid ? 'VERIFIED_TAMPER_FREE' : 'TAMPER_DETECTED',
      },
      timestamp: new Date().toISOString(),
    };
  }
}

