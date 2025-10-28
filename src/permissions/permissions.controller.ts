import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CheckAbilities } from 'src/casl/abilities.decorator';
import { AbilitiesGuard } from 'src/casl/abilities.guard';
import { Action } from 'src/casl/casl-ability.factory';
import { FilterSearchQueryDto } from 'src/common/dto/filter-search-query.dto';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { RequestWithBaseUrl } from 'src/common/interfaces/request-with-base-url.interface';
import { PermissionsService } from './permissions.service';

@ApiBearerAuth()
@ApiTags('Permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard, AbilitiesGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all permissions with filter and search' })
  @CheckAbilities({ action: Action.Read, subject: 'Permission' })
  findAll(
    @Req() req: RequestWithBaseUrl,
    @Query() query: FilterSearchQueryDto,
  ): Promise<PaginatedResponse<Permission>> {
    return this.permissionsService.findAll(query, req.baseUrl);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single permission by ID' })
  @CheckAbilities({ action: Action.Read, subject: 'Permission' })
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }
}
