import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { CHECK_ABILITIES_KEY, RequiredRule } from './abilities.decorator';
import { CaslAbilityFactory } from './casl-ability.factory';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
  };
}

@Injectable()
export class AbilitiesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rules =
      this.reflector.get<RequiredRule[]>(
        CHECK_ABILITIES_KEY,
        context.getHandler(),
      ) || [];
    if (!rules.length) {
      return true; // No rules, access granted
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user } = request;

    if (!user) {
      throw new ForbiddenException('User not found in request');
    }

    const userWithRolesAndPermissions = await this.prisma.user.findUnique({
      where: { id: user.id },
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

    if (!userWithRolesAndPermissions) {
      throw new ForbiddenException('User not found.');
    }

    const ability = this.caslAbilityFactory.createForUser(
      userWithRolesAndPermissions,
    );

    return rules.every((rule) => ability.can(rule.action, rule.subject));
  }
}
