import { Injectable, NotFoundException } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { FilterSearchQueryDto } from 'src/common/dto/filter-search-query.dto';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { paginate } from 'src/common/utils/paginator';
import { createPrismaWhereClause } from 'src/common/utils/prisma-helpers';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  // READ ALL
  async findAll(
    query: FilterSearchQueryDto,
    baseUrl: string,
  ): Promise<PaginatedResponse<Permission>> {
    const searchableFields = ['action', 'subject', 'reason'];
    const whereClause = createPrismaWhereClause(query, searchableFields);

    return paginate<Permission>(
      this.prisma.permission,
      { where: whereClause },
      {
        page: query.page,
        limit: query.limit,
        baseUrl,
      },
    );
  }

  // READ ONE
  async findOne(id: string): Promise<Permission> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found.`);
    }
    return permission;
  }
}
