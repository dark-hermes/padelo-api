import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { SanitizedUser } from 'src/auth/auth.interface';
import { UserResponseDto } from 'src/auth/dto/user-response.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { createMulterOptions } from 'src/common/utils/multer-options';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@ApiBearerAuth()
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  getProfile(@Req() req: { user: User }): Promise<SanitizedUser> {
    return this.profileService.getProfile(req.user.id);
  }

  @Patch('update')
  @ApiOperation({
    summary: 'Update current user profile',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async updateProfile(
    @Req() req: { user: User },
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const updatedUser = await this.profileService.updateProfile(
      req.user.id,
      updateProfileDto,
    );
    return {
      message: 'Profil berhasil diperbarui.',
      user: updatedUser,
    };
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async changePassword(
    @Req() req: { user: User },
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<SuccessResponseDto> {
    await this.profileService.changePassword(req.user.id, changePasswordDto);
    return { message: 'Password berhasil diubah.' };
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor(
      'avatar',
      createMulterOptions({
        destination: './uploads/avatars',
        fileFilterRegex: /\.(jpg|jpeg|png)$/i,
        maxSize: 2 * 1024 * 1024, // 2 MB
      }),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload or update user avatar' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'The avatar image file to upload.',
        },
      },
      required: ['avatar'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Avatar uploaded successfully.',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  async uploadAvatar(
    @Req() req: { user: User },
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserResponseDto> {
    if (!file) {
      throw new BadRequestException(
        'File is required. Check file type and size limits.',
      );
    }
    const updatedUser = await this.profileService.uploadAvatar(
      req.user.id,
      file,
    );
    return {
      message: 'Avatar berhasil diunggah.',
      user: updatedUser,
    };
  }
}
