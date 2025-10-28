import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'oldPassword123',
    description: 'User old password',
  })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'User new password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'User new password confirmation',
  })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
