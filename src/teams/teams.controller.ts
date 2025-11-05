import {
  BadRequestException,
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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Team } from '@prisma/client';
import { CheckAbilities } from 'src/casl/abilities.decorator';
import { Action } from 'src/casl/casl-ability.factory';
import { FilterSearchQueryDto } from 'src/common/dto/filter-search-query.dto';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { RequestWithBaseUrl } from 'src/common/interfaces/request-with-base-url.interface';
import { createMulterOptions } from 'src/common/utils/multer-options';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamResponseDto } from './dto/team-response.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new team member' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Team created successfully',
    type: TeamResponseDto,
  })
  @CheckAbilities({ action: Action.Create, subject: 'Team' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTeamDto: CreateTeamDto): Promise<TeamResponseDto> {
    const newTeam = await this.teamsService.create(createTeamDto);
    return { message: 'Team member berhasil dibuat.', team: newTeam };
  }

  @Get()
  @ApiOperation({ summary: 'Get all team members' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of team members' })
  @CheckAbilities({ action: Action.Read, subject: 'Team' })
  findAll(
    @Req() req: RequestWithBaseUrl,
    @Query() query: FilterSearchQueryDto,
  ): Promise<PaginatedResponse<Team>> {
    return this.teamsService.findAll(query, req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a team member by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team retrieved successfully',
  })
  @CheckAbilities({ action: Action.Read, subject: 'Team' })
  findOne(@Param('id') id: string): Promise<Team> {
    return this.teamsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a team member by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team updated successfully',
    type: TeamResponseDto,
  })
  @CheckAbilities({ action: Action.Update, subject: 'Team' })
  async update(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    const updated = await this.teamsService.update(id, updateTeamDto);
    return { message: 'Team berhasil diperbarui.', team: updated };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a team member by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Team deleted successfully',
    type: SuccessResponseDto,
  })
  @CheckAbilities({ action: Action.Delete, subject: 'Team' })
  async remove(@Param('id') id: string): Promise<SuccessResponseDto> {
    await this.teamsService.remove(id);
    return { message: 'Team berhasil dihapus.' };
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor(
      'image',
      createMulterOptions({
        destination: './uploads/teams',
        fileFilterRegex: /\.(jpg|jpeg|png)$/i,
        maxSize: 2 * 1024 * 1024,
      }),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload or update team member image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary', description: 'Image file' },
      },
      required: ['image'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Image uploaded successfully',
    type: TeamResponseDto,
  })
  @CheckAbilities({ action: Action.Update, subject: 'Team' })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<TeamResponseDto> {
    if (!file) {
      throw new BadRequestException(
        'File is required. Check file type and size limits.',
      );
    }
    const updated = await this.teamsService.uploadImage(id, file);
    return { message: 'Gambar tim berhasil diunggah.', team: updated };
  }
}
