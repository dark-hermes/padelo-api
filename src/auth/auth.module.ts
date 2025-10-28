// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { parseExpiresIn } from 'src/common/utils/jwt-config.util';
import { PrismaModule } from '../prisma/prisma.module'; // Import PrismaModule
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
// JwtServiceCompat available for explicit injection where needed; not provided
// globally to avoid DI cycles.
import './jwt-service.compat';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: parseExpiresIn(
            configService.get<string>('JWT_EXPIRATION_TIME'),
          ),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    // Do not override JwtService here to avoid circular DI. If you need the
    // compat wrapper in a specific provider, inject `JwtServiceCompat` directly.
  ],
  controllers: [AuthController],
})
export class AuthModule {}
