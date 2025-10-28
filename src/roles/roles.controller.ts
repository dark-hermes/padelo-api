import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CheckAbilities } from 'src/casl/abilities.decorator';
import { Action } from 'src/casl/casl-ability.factory';
import { FilterSearchQueryDto } from 'src/common/dto/filter-search-query.dto';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { RequestWithBaseUrl } from 'src/common/interfaces/request-with-base-url.interface';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // CREATE
  @Post()
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role created successfully',
    type: RoleResponseDto,
  })
  @CheckAbilities({ action: Action.Create, subject: 'Role' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    const newRole = await this.rolesService.create(createRoleDto);
    return {
      message: 'Role baru berhasil dibuat.',
      role: newRole,
    };
  }

  // READ ALL
  @Get()
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of roles',
  })
  @CheckAbilities({ action: Action.Read, subject: 'Role' })
  findAll(
    @Req() req: RequestWithBaseUrl,
    @Query() query: FilterSearchQueryDto,
  ): Promise<PaginatedResponse<Role>> {
    return this.rolesService.findAll(query, req);
  }

  // READ ONE
  @Get(':id')
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role retrieved successfully',
  })
  @CheckAbilities({ action: Action.Read, subject: 'Role' })
  findOne(@Param('id') id: string): Promise<Role> {
    return this.rolesService.findOne(id);
  }

  // UPDATE
  @Patch(':id')
  @ApiOperation({ summary: 'Update a role by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role updated successfully',
    type: RoleResponseDto,
  })
  @CheckAbilities({ action: Action.Update, subject: 'Role' })
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    const updatedRole = await this.rolesService.update(id, updateRoleDto);
    return {
      message: 'Role berhasil diperbarui.',
      role: updatedRole,
    };
  }

  // DELETE
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a role by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role deleted successfully',
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @CheckAbilities({ action: Action.Delete, subject: 'Role' })
  async remove(@Param('id') id: string): Promise<SuccessResponseDto> {
    await this.rolesService.remove(id);
    return { message: 'Role berhasil dihapus.' };
  }
}
