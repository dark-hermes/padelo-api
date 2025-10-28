// src/auth/dto/register-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password (minimum 8 characters)',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password confirmation (must match the password)',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, {
    message: 'Password confirmation must be at least 8 characters long',
  })
  passwordConfirmation: string;
}
