import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: () => void) {
    try {
      // Query DB directly (no cache)
      const maintenanceSetting = await this.prisma.setting.findUnique({
        where: { key: 'maintenanceMode' },
      });

      const maintenance = maintenanceSetting?.value === 'true';

      if (maintenance) {
        // Check if user has "manage all" permission
        const hasManageAll = await this.checkManageAllPermission(req);
        if (hasManageAll) {
          return next();
        }

        // Whitelist: Allow authentication and settings endpoints
        // - /auth/* : Allow login, register, logout, etc. so admin can authenticate
        // - /settings/* : Allow settings management for maintenance mode toggle
        // - /maintenance : Allow access to maintenance page
        // - /_next/* : Allow Next.js static assets

        // Use originalUrl or baseUrl + path to get the full path
        const fullPath = req.originalUrl || req.baseUrl + req.path;

        if (
          fullPath.startsWith('/auth') ||
          fullPath.startsWith('/settings') ||
          fullPath.startsWith('/profile/me') ||
          fullPath === '/maintenance' ||
          fullPath.startsWith('/_next')
        ) {
          return next();
        }

        // If client expects HTML, redirect to maintenance page
        const accept = req.headers.accept || '';
        if (accept.includes('text/html')) {
          return res.redirect(302, '/maintenance');
        }

        // For API requests, return 503
        return res
          .status(503)
          .json({ message: 'Service is under maintenance' });
      }

      return next();
    } catch (error) {
      // On error, allow request to proceed
      console.error('[MaintenanceMiddleware] Error:', error);
      return next();
    }
  }

  private async checkManageAllPermission(req: Request): Promise<boolean> {
    try {
      // Extract JWT from cookie
      const token = req.cookies?.['access_token'] as string | undefined;
      if (!token) return false;

      // Verify JWT
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) return false;

      let userId: string;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const decoded = this.jwtService.verify(token, { secret });
        if (
          !decoded ||
          typeof decoded !== 'object' ||
          !('sub' in decoded) ||
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          typeof decoded.sub !== 'string'
        ) {
          return false;
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        userId = decoded.sub;
      } catch {
        return false;
      }

      // Get user with roles and permissions
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user?.roles || user.roles.length === 0) return false;

      // Check if any of the user's roles has "manage all" permission
      const hasManageAll = user.roles.some((userRole) =>
        userRole.role.permissions.some(
          (rp) =>
            rp.permission.action === 'manage' &&
            rp.permission.subject === 'all',
        ),
      );

      return hasManageAll;
    } catch {
      // If any error (invalid token, etc.), return false
      return false;
    }
  }
}
