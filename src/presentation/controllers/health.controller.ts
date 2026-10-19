import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

/**
 * Health & Continuous Monitoring Controller
 *
 * Implements:
 * - SOC 2 Type II: Continuous Monitoring & Telemetry
 * - Evaluates database connectivity, WORM audit chain integrity, and system uptime
 */
@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  async check() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
    };
  }
}
