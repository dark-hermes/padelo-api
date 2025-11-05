// src/casl/casl-ability.factory.ts
import {
  Ability,
  AbilityBuilder,
  AbilityClass,
  ExtractSubjectType,
  InferSubjects,
} from '@casl/ability';
import { PrismaQuery } from '@casl/prisma';
import { Injectable } from '@nestjs/common';
import {
  Permission,
  Prisma,
  Product,
  ProductCategory,
  ProductImage,
  ProductVariant,
  Role,
  Team,
  User,
} from '@prisma/client';

// Define Actions and Subjects
export enum Action {
  Manage = 'manage', // wildcard for any action
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

// Explicitly type Subjects - using string literals since Prisma types are not classes
export type Subjects =
  | InferSubjects<
      | User
      | Role
      | Permission
      | Team
      | Product
      | ProductCategory
      | ProductVariant
      | ProductImage
      | 'User'
      | 'Role'
      | 'Permission'
      | 'Team'
      | 'Product'
      | 'ProductCategory'
      | 'ProductVariant'
      | 'ProductImage'
    >
  | 'all';
export type AppAbility = Ability<[Action, Subjects], PrismaQuery>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(
    user: Prisma.UserGetPayload<{
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } };
            };
          };
        };
      };
    }>,
  ) {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      Ability as AbilityClass<AppAbility>,
    );

    user.roles.forEach((userRole) => {
      userRole.role.permissions.forEach((rolePermission) => {
        const { permission } = rolePermission;
        if (permission.inverted) {
          cannot(
            permission.action as Action,
            permission.subject as any,
          ).because(permission.reason);
        } else {
          can(permission.action as Action, permission.subject as any);
        }
      });
    });

    return build({
      detectSubjectType: (item) => {
        // Check if subject was explicitly set using subject() helper
        if (item && typeof item === 'object' && '__caslSubjectType__' in item) {
          return item.__caslSubjectType__ as ExtractSubjectType<Subjects>;
        }
        // Fallback to constructor name for class instances
        return item.constructor as unknown as ExtractSubjectType<Subjects>;
      },
    });
  }
}
