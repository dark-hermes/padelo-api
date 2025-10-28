// src/auth/auth.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { parseExpiresIn } from 'src/common/utils/jwt-config.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  JwtPayload,
  LoginResponse,
  SanitizedUser,
  Tokens,
} from './auth.interface';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Hashes a password using bcrypt.
   * @param data The string to hash.
   * @returns The hashed string.
   */
  private async hashData(data: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(data, salt);
  }

  /**
   * Generates JWT access and refresh tokens.
   * @param payload The JWT payload.
   * @returns An object containing the access and refresh tokens.
   */
  private async getTokens(payload: JwtPayload): Promise<Tokens> {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: parseExpiresIn(
        this.configService.get<string>('JWT_EXPIRATION_TIME'),
      ),
    });

    // Add a unique JWT ID (jti) to the refresh token payload so that each refresh
    // token is unique even if other claims are identical. This prevents collisions
    // when tests run repeatedly against the same DB.
    const refreshPayload = { ...payload, jti: randomUUID() } as JwtPayload & {
      jti: string;
    };

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: parseExpiresIn(
        this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME'),
      ),
    });

    return { accessToken, refreshToken };
  }

  /**
   * Sanitizes user object by removing the password.
   * @param user The user object.
   * @returns A user object without the password field.
   */
  private sanitizeUser(user: User): SanitizedUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  /**
   * Registers a new user.
   * @param dto The registration data.
   * @returns The newly created user (sanitized).
   */
  async register(dto: RegisterUserDto): Promise<SanitizedUser> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    const hashedPassword = await this.hashData(dto.password);

    // Find the default 'USER' role
    const userRole = await this.prisma.role.findUnique({
      where: { name: 'USER' },
    });

    if (!userRole) {
      throw new NotFoundException(
        'Default USER role not found. Please seed the database.',
      );
    }

    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        roles: {
          create: [{ roleId: userRole.id }],
        },
      },
    });

    return this.sanitizeUser(newUser);
  }

  /**
   * Logs a user in.
   * @param dto The login data.
   * @returns A login response containing the user and tokens.
   */
  async login(dto: LoginUserDto): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Generate tokens and persist refresh token. Retry on unique constraint failures
    // because e2e tests can sometimes produce collisions when running against the
    // same DB concurrently.
    let tokens = await this.getTokens({ sub: user.id, email: user.email });

    const refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRATION_TIME; // in days

    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() +
        (refreshTokenExpiry ? parseInt(refreshTokenExpiry) : 7),
    );

    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        await this.prisma.refreshToken.create({
          data: {
            token: tokens.refreshToken,
            userId: user.id,
            expiresAt,
          },
        });
        break; // success
      } catch (err: unknown) {
        // If token collision, regenerate tokens and retry.
        // Use a safe runtime check to avoid accessing properties on `any` and satisfy
        // the `@typescript-eslint/no-unsafe-member-access` rule.
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code?: string }).code === 'P2002'
        ) {
          // regenerate tokens and retry
          tokens = await this.getTokens({ sub: user.id, email: user.email });
          if (attempt === maxAttempts - 1) {
            // final attempt failed
            throw new ConflictException(
              'Failed to create unique refresh token.',
            );
          }
          // otherwise continue and retry
        } else {
          throw err;
        }
      }
    }

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
