import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../../application/services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { SafeUserDto } from '../../domain/entities/user.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Authentication REST Controller
 *
 * Implements:
 * - Passwords hashed using bcrypt (10 rounds); plaintext passwords never stored
 * - JWT Authentication with cryptographically signed tokens
 * - Basic Rate Limiting: Limits repeated login attempts to prevent brute-force attacks (OWASP A07)
 * - Sensitive information (password_hash) strictly excluded from all API responses
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user account.
   * Rate limited to mitigate bulk automated registration abuse.
   */
  @Post('register')
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'test' ? 500 : 10,
      ttl: 60000,
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<SafeUserDto> {
    return this.authService.register(dto);
  }

  /**
   * Login endpoint issuing signed JWT Bearer tokens.
   * Strict rate limiting: Max 5 attempts per minute per IP to mitigate brute-force risks.
   */
  @Post('login')
  @Throttle({
    default: {
      limit: process.env.NODE_ENV === 'test' ? 500 : 5,
      ttl: 60000,
    },
  })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
  ): Promise<{ accessToken: string; user: SafeUserDto }> {
    return this.authService.login(dto);
  }

  /**
   * Protected route: Returns current authenticated user profile.
   * Requires valid JWT Bearer token in Authorization header.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Req() req: any): Promise<SafeUserDto> {
    const userId = req.user.sub || req.user.id;
    return this.authService.getUserProfile(userId);
  }
}
