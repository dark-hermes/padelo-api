import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Team } from '@prisma/client';
import * as fs from 'fs/promises';
import { FilterSearchQueryDto } from 'src/common/dto/filter-search-query.dto';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { RequestWithBaseUrl } from 'src/common/interfaces/request-with-base-url.interface';
import { paginate } from 'src/common/utils/paginator';
import {
  createPrismaOrderByClause,
  createPrismaWhereClause,
} from 'src/common/utils/prisma-helpers';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    // No unique constraint on Team.name; just create
    return await this.prisma.team.create({ data: createTeamDto });
  }

  async findAll(
    query: FilterSearchQueryDto,
    req: RequestWithBaseUrl,
  ): Promise<PaginatedResponse<Team>> {
    const searchableFields = ['name', 'position'];
    const whereClause = createPrismaWhereClause(query, searchableFields);

    const orderBy = createPrismaOrderByClause(query.sortBy);

    const queryArgs = {
      where: whereClause,
      orderBy,
    } as const;

    const paginatedResult = await paginate<Team>(this.prisma.team, queryArgs, {
      page: query.page,
      limit: query.limit,
      baseUrl: req.baseUrlFull,
    });
    return paginatedResult;
  }

  async findOne(id: string): Promise<Team> {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) {
      throw new NotFoundException(`Team with ID "${id}" not found.`);
    }
    return team;
  }

  async update(id: string, updateTeamDto: UpdateTeamDto): Promise<Team> {
    const existing = await this.prisma.team.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Team with ID "${id}" not found.`);
    }

    const data: Prisma.TeamUpdateInput = {
      ...updateTeamDto,
    } as unknown as Prisma.TeamUpdateInput;

    return await this.prisma.team.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.team.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Team with ID "${id}" not found.`);
    }

    await this.prisma.team.delete({ where: { id } });
  }

  private async _updateTeamImageField(
    teamId: string,
    file: Express.Multer.File,
  ): Promise<Team> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      // cleanup uploaded file
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.warn(
          'Failed to cleanup uploaded file',
          error instanceof Error ? error.message : error,
        );
      }
      throw new NotFoundException('Team not found.');
    }

    const oldImagePath = team.image;
    if (typeof oldImagePath === 'string' && oldImagePath) {
      try {
        await fs.unlink(oldImagePath);
      } catch (error) {
        console.warn(
          'Failed to delete old image',
          error instanceof Error ? error.message : error,
        );
      }
    }

    const updatedTeam = await this.prisma.team.update({
      where: { id: teamId },
      data: { image: file.path },
    });
    return updatedTeam;
  }

  async uploadImage(teamId: string, file: Express.Multer.File): Promise<Team> {
    return await this._updateTeamImageField(teamId, file);
  }
}
