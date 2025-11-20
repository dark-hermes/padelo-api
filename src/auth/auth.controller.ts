// src/auth/auth.controller.ts
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { Response } from 'express';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { SanitizedUser } from './auth.interface';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User with this email already exists',
  })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerUserDto: RegisterUserDto,
  ): Promise<SanitizedUser> {
    return this.authService.register(registerUserDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User logged in successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SanitizedUser> {
    const loginData = await this.authService.login(loginUserDto);

    const accessToken = loginData.tokens.accessToken;
    const refreshToken = loginData.tokens.refreshToken;

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'none',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'none',
    });

    return loginData.user;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User logged out successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async logout(
    @Req() req: { user: User },
    @Res({ passthrough: true }) res: Response,
  ): Promise<SuccessResponseDto> {
    await this.authService.logout(req.user.id);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return {
      message: 'Logged out successfully.',
    };
  }

  @Post('clear-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear session cookies (no auth required)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session cleared successfully',
  })
  clearSession(@Res({ passthrough: true }) res: Response): SuccessResponseDto {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return {
      message: 'Session cleared successfully.',
    };
  }
}
