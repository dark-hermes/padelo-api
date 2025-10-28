import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs/promises';
import { SanitizedUser } from 'src/auth/auth.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  // Accept a User that may contain extra relation properties (roles, etc.)
  private sanitizeUser(user: User & Record<string, unknown>): SanitizedUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async getProfile(userId: string): Promise<SanitizedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    // Map RolePermission -> permission object for easier consumption on client
    const mappedRoles = (user.roles || []).map((ur) => {
      const role = ur.role as {
        id: string;
        name: string;
        permissions?: { permission: { action: string; subject: string } }[];
      };
      return {
        id: role.id,
        name: role.name,
        permissions: (role.permissions || []).map((rp) => rp.permission),
      };
    });

    // user may include relation fields from Prisma (roles). sanitizeUser
    // accepts extra fields now, so pass it directly.
    const sanitized = this.sanitizeUser(user as User & Record<string, unknown>);
    return {
      ...sanitized,
      roles: mappedRoles,
    } as unknown as SanitizedUser;
  }

  async updateProfile(
    userId: string,
    changePasswordDto: UpdateProfileDto,
  ): Promise<SanitizedUser> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: changePasswordDto,
    });
    return this.sanitizeUser(updatedUser);
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException(
        'New password and confirmation do not match.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Old password is incorrect.');
    }

    if (changePasswordDto.oldPassword === changePasswordDto.newPassword) {
      throw new BadRequestException(
        'New password must be different from the old password.',
      );
    }

    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      10,
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });
  }

  private async _updateUserImageField(
    userId: string,
    file: Express.Multer.File,
    field: 'avatar',
  ): Promise<SanitizedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await fs.unlink(file.path);
      throw new NotFoundException('User not found.');
    }

    const oldImagePath = user[field];
    if (typeof oldImagePath === 'string' && oldImagePath) {
      try {
        await fs.unlink(oldImagePath);
      } catch (error) {
        console.warn(
          `Failed to delete old image at ${oldImagePath}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { [field]: file.path },
    });
    return this.sanitizeUser(updatedUser);
  }

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<SanitizedUser> {
    return this._updateUserImageField(userId, file, 'avatar');
  }
}
