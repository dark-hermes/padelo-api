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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { SanitizedUser } from 'src/auth/auth.interface';
import { UserResponseDto } from 'src/auth/dto/user-response.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FilterSearchQueryDto } from 'src/common/dto/filter-search-query.dto';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { RequestWithBaseUrl } from 'src/common/interfaces/request-with-base-url.interface';
import { CheckAbilities } from '../casl/abilities.decorator';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { Action } from '../casl/casl-ability.factory';
import { SuccessResponseDto } from './../common/dto/success-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

interface RequestWithUser extends RequestWithBaseUrl {
  user: User;
}

@ApiBearerAuth()
@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, AbilitiesGuard) // Protect all routes in this controller
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new user',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @CheckAbilities({ action: Action.Create, subject: 'User' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const newUser = await this.usersService.create(createUserDto);
    return {
      message: 'User baru berhasil dibuat.',
      user: newUser,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'filter', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Sort by field:direction (e.g., name:asc)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of users retrieved successfully',
  })
  @CheckAbilities({ action: Action.Read, subject: 'User' })
  findAll(
    @Req() req: RequestWithUser,
    @Query() query: FilterSearchQueryDto,
  ): Promise<PaginatedResponse<SanitizedUser>> {
    return this.usersService.findAll(req.user, query, req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @CheckAbilities({ action: Action.Read, subject: 'User' })
  findOne(
    @Param('id') id: string,
    @Req() req: { user: User },
  ): Promise<SanitizedUser> {
    return this.usersService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @CheckAbilities({ action: Action.Update, subject: 'User' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: { user: User },
  ): Promise<UserResponseDto> {
    const updatedUser = await this.usersService.update(
      id,
      updateUserDto,
      req.user,
    );
    return {
      message: 'User berhasil diperbarui.',
      user: updatedUser,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User deleted successfully',
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @CheckAbilities({ action: Action.Delete, subject: 'User' })
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @Req() req: { user: User },
  ): Promise<SuccessResponseDto> {
    await this.usersService.remove(id, req.user);
    return { message: 'User berhasil dihapus.' };
  }
}
