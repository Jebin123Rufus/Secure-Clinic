import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { SafeUserDto, UserEntity } from '../../domain/entities/user.entity';
import { RegisterDto } from '../../presentation/dto/register.dto';
import { LoginDto } from '../../presentation/dto/login.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: 'Doctor' | 'Clerk' | 'Admin';
  clinicId: string | null;
}

/**
 * Enterprise Authentication Service
 *
 * Implements:
 * - OWASP Top 10 (A02: Cryptographic Failures & A07: Identification and Authentication Failures)
 * - Passwords hashed using bcrypt (10 rounds); plaintext passwords never persisted
 * - Signed JSON Web Tokens (JWT) for stateless, cryptographically verifiable sessions
 * - Sensitive credentials (password_hash) strictly sanitized and never returned in API responses
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiration: string;
  private readonly saltRounds = 10;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>(
      'JWT_SECRET',
      '',
    );
    this.jwtExpiration = this.configService.get<string>('JWT_EXPIRATION', '1d');
    if (this.jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters.');
    }
  }

  /**
   * Hashes a plaintext password using bcrypt with 10 salt rounds.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Validates a candidate password against the stored bcrypt hash.
   */
  async comparePassword(candidate: string, hash: string): Promise<boolean> {
    return bcrypt.compare(candidate, hash);
  }

  /**
   * Registers a new user with bcrypt-hashed credentials and optional tenant assignment.
   */
  async register(dto: RegisterDto): Promise<SafeUserDto> {
    // 1. Check if email already registered (SQL Parameterized Query - OWASP A03)
    const existingResult = await this.databaseService.executeQuery(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;',
      [dto.email.trim()],
    );

    if (existingResult.rows.length > 0) {
      throw new ConflictException(
        `User with email "${dto.email}" is already registered.`,
      );
    }

    // 2. Validate clinicId if supplied
    if (dto.clinicId) {
      const clinicResult = await this.databaseService.executeQuery(
        'SELECT id FROM clinics WHERE id = $1 AND is_active = true LIMIT 1;',
        [dto.clinicId],
      );
      if (clinicResult.rows.length === 0) {
        throw new NotFoundException(`Clinic with ID "${dto.clinicId}" does not exist or is inactive.`);
      }
    }

    // 3. Hash password using bcrypt
    const passwordHash = await this.hashPassword(dto.password);
    const userId = uuidv4();

    // 4. Persist user via parameterized query (prevents SQL Injection)
    const insertQuery = `
      INSERT INTO users (id, clinic_id, email, password_hash, name, role, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;

    const result = await this.databaseService.executeQuery(insertQuery, [
      userId,
      dto.clinicId || null,
      dto.email.trim().toLowerCase(),
      passwordHash,
      dto.name.trim(),
      dto.role,
    ]);

    const entity = UserEntity.fromRow(result.rows[0]);
    this.logger.log(`User registered: ${entity.email} [${entity.role}] (ID: ${entity.id})`);

    // 5. Return sanitized DTO (password_hash is stripped)
    return entity.toSafeUser();
  }

  /**
   * Authenticates user credentials and generates a signed JWT access token.
   */
  async login(dto: LoginDto): Promise<{ accessToken: string; user: SafeUserDto }> {
    // 1. Query user by email (parameterized query)
    const result = await this.databaseService.executeQuery(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;',
      [dto.email.trim()],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const entity = UserEntity.fromRow(result.rows[0]);

    if (!entity.isActive) {
      throw new UnauthorizedException('Account has been deactivated. Contact an administrator.');
    }

    // 2. Verify password against bcrypt hash
    const isPasswordValid = await this.comparePassword(dto.password, entity.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // 3. Generate signed JWT token
    const payload: JwtPayload = {
      sub: entity.id,
      email: entity.email,
      name: entity.name,
      role: entity.role,
      clinicId: entity.clinicId,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiration as any,
    });

    this.logger.log(`User logged in successfully: ${entity.email} [${entity.role}]`);

    return {
      accessToken,
      user: entity.toSafeUser(),
    };
  }

  /**
   * Verifies and decodes a JWT access token.
   */
  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JwtPayload;
    } catch (err: any) {
      throw new UnauthorizedException(`Invalid or expired authentication token (${err.message}).`);
    }
  }

  /**
   * Retrieves a sanitized user profile by UUID.
   */
  async getUserProfile(userId: string): Promise<SafeUserDto> {
    const result = await this.databaseService.executeQuery(
      'SELECT * FROM users WHERE id = $1 LIMIT 1;',
      [userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`User with ID "${userId}" not found.`);
    }

    const entity = UserEntity.fromRow(result.rows[0]);
    return entity.toSafeUser();
  }
}
