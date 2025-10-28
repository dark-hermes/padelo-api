// src/users/users.service.ts
import { ForbiddenError, subject } from '@casl/ability';
import { accessibleBy } from '@casl/prisma';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SanitizedUser } from 'src/auth/auth.interface';
import { FilterSearchQueryDto } from 'src/common/dto/filter-search-query.dto';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { RequestWithBaseUrl } from 'src/common/interfaces/request-with-base-url.interface';
import { paginate } from 'src/common/utils/paginator';
import {
  createPrismaOrderByClause,
  createPrismaWhereClause,
} from 'src/common/utils/prisma-helpers';
import { Action, CaslAbilityFactory } from '../casl/casl-ability.factory';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  private sanitizeUser(user: User): SanitizedUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  private async getUserWithPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<SanitizedUser> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const userRole = await this.prisma.role.findUnique({
      where: { id: createUserDto.roleId },
    });
    if (!userRole) {
      throw new NotFoundException('Specified role not found.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { roleId, ...userData } = createUserDto;
    const newUser = await this.prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        roles: {
          create: [{ role: { connect: { id: userRole.id } } }],
        },
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    return this.sanitizeUser(newUser);
  }

  async findAll(
    currentUser: User,
    query: FilterSearchQueryDto,
    req: RequestWithBaseUrl,
  ): Promise<PaginatedResponse<SanitizedUser>> {
    const userWithPermissions = await this.getUserWithPermissions(
      currentUser.id,
    );
    const ability = this.caslAbilityFactory.createForUser(userWithPermissions);
    const caslWhereClause: Prisma.UserWhereInput = accessibleBy(ability).User;

    const searchableFields = ['name', 'email'];
    const filterSearchWhereClause =
      createPrismaWhereClause<Prisma.UserWhereInput>(query, searchableFields);

    const orderBy = createPrismaOrderByClause(query.sortBy);

    const where: Prisma.UserWhereInput = {
      AND: [caslWhereClause, filterSearchWhereClause].filter(
        (clause) => Object.keys(clause).length > 0,
      ),
    };

    const includeClause = {
      roles: { include: { role: true } },
    };

    const paginatedResult = await paginate<User>(
      this.prisma.user,
      { where, orderBy, include: includeClause },
      {
        page: query.page,
        limit: query.limit,
        baseUrl: req.baseUrlFull,
      },
    );

    return {
      ...paginatedResult,
      data: paginatedResult.data.map((user) => this.sanitizeUser(user)),
    };
  }

  async findOne(id: string, currentUser: User): Promise<SanitizedUser> {
    const userToFind = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
    if (!userToFind) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }

    const userWithPermissions = await this.getUserWithPermissions(
      currentUser.id,
    );
    const ability = this.caslAbilityFactory.createForUser(userWithPermissions);

    ForbiddenError.from(ability).throwUnlessCan(
      Action.Read,
      subject('User', userToFind),
    );

    return this.sanitizeUser(userToFind);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUser: User,
  ): Promise<SanitizedUser> {
    const userToUpdate = await this.prisma.user.findUnique({ where: { id } });
    if (!userToUpdate) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }

    const userWithPermissions = await this.getUserWithPermissions(
      currentUser.id,
    );
    const ability = this.caslAbilityFactory.createForUser(userWithPermissions);

    ForbiddenError.from(ability).throwUnlessCan(
      Action.Update,
      subject('User', userToUpdate),
    );

    const { roleId, password, email, ...updateData } = updateUserDto;
    const data: Prisma.UserUpdateInput = { ...updateData };

    if (email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(`Email "${email}" is already in use.`);
      }
      data.email = email;
    }

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    if (roleId) {
      const newRole = await this.prisma.role.findUnique({
        where: { id: roleId },
      });
      if (!newRole) {
        throw new NotFoundException('Specified role not found.');
      }
      data.roles = {
        deleteMany: {},
        create: { role: { connect: { id: newRole.id } } },
      };
    }

    const updatedUser = await this.prisma.user.update({ where: { id }, data });
    return this.sanitizeUser(updatedUser);
  }

  async remove(id: string, currentUser: User): Promise<void> {
    if (currentUser.id === id) {
      throw new ForbiddenException('You cannot delete your own account.');
    }

    const userToDelete = await this.prisma.user.findUnique({ where: { id } });
    if (!userToDelete) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }

    const userWithPermissions = await this.getUserWithPermissions(
      currentUser.id,
    );
    const ability = this.caslAbilityFactory.createForUser(userWithPermissions);

    ForbiddenError.from(ability).throwUnlessCan(
      Action.Delete,
      subject('User', userToDelete),
    );

    await this.prisma.user.delete({ where: { id } });
  }
}
