import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { FilterSearchQueryDto } from 'src/common/dto/filter-search-query.dto';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { RequestWithBaseUrl } from 'src/common/interfaces/request-with-base-url.interface';
import { paginate } from 'src/common/utils/paginator';
import {
  createPrismaOrderByClause,
  createPrismaWhereClause,
} from 'src/common/utils/prisma-helpers';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const { name, permissionIds } = createRoleDto;

    const existingRole = await this.prisma.role.findUnique({
      where: { name },
    });

    if (existingRole) {
      throw new ConflictException(`Role with name ${name} already exists.`);
    }

    try {
      return await this.prisma.role.create({
        data: {
          name,
          permissions: {
            create: permissionIds.map((permissionId) => ({
              permission: {
                connect: { id: permissionId },
              },
            })),
          },
        },
        include: {
          permissions: { include: { permission: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('One or more permissions not found.');
        }
      }
      throw error;
    }
  }

  async findAll(
    query: FilterSearchQueryDto,
    req: RequestWithBaseUrl,
  ): Promise<PaginatedResponse<Role>> {
    const searchableFields = ['name'];
    const whereClause = createPrismaWhereClause(query, searchableFields);

    const orderBy = createPrismaOrderByClause(query.sortBy);

    const includeClause = {
      permissions: { include: { permission: true } },
      users: true, // Include users to count them
    };

    const queryArgs = {
      where: whereClause,
      orderBy,
      include: includeClause,
    };

    const paginatedResult = await paginate<Role>(this.prisma.role, queryArgs, {
      page: query.page,
      limit: query.limit,
      baseUrl: req.baseUrlFull,
    });
    return paginatedResult;
  }

  async findOne(id: string): Promise<Role> {
    const roleToFind = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        users: true, // Include users to count them
      },
    });
    if (!roleToFind) {
      throw new NotFoundException(`Role with ID "${id}" not found.`);
    }
    return roleToFind;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const roleToUpdate = await this.prisma.role.findUnique({ where: { id } });
    if (!roleToUpdate) {
      throw new NotFoundException(`Role with ID "${id}" not found.`);
    }

    const { permissionIds, ...updateData } = updateRoleDto;
    const data: Prisma.RoleUpdateInput = { ...updateData };

    if (permissionIds) {
      data.permissions = {
        deleteMany: {},
        create: permissionIds.map((permissionId) => ({
          permission: { connect: { id: permissionId } },
        })),
      };
    }

    try {
      return await this.prisma.role.update({
        where: { id },
        data,
        include: {
          permissions: { include: { permission: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('One or more permissions not found.');
        }
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const roleToDelete = await this.prisma.role.findUnique({ where: { id } });
    if (!roleToDelete) {
      throw new NotFoundException(`Role with ID "${id}" not found.`);
    }

    await this.prisma.role.delete({ where: { id } });
  }
}
