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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Landing } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CheckAbilities } from 'src/casl/abilities.decorator';
import { AbilitiesGuard } from 'src/casl/abilities.guard';
import { Action } from 'src/casl/casl-ability.factory';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { CreateLandingDto } from './dto/create-landing.dto';
import { LandingDetailResponseDto } from './dto/landing-detail-response.dto';
import { LandingResponseDto } from './dto/landing-response.dto';
import { UpdateLandingDto } from './dto/update-landing.dto';
import { LandingService } from './landing.service';

@ApiTags('Landing')
@Controller('landing')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new landing page' })
  @ApiResponse({ status: HttpStatus.CREATED, type: LandingResponseDto })
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities({ action: Action.Create, subject: 'Landing' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createLandingDto: CreateLandingDto,
  ): Promise<LandingResponseDto> {
    const landing = await this.landingService.create(createLandingDto);
    return { message: 'Landing berhasil dibuat.', landing };
  }

  @Get()
  @ApiOperation({ summary: 'Get all landing pages' })
  @ApiResponse({ status: HttpStatus.OK })
  findAll(): Promise<Landing[]> {
    return this.landingService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a landing page by ID' })
  @ApiResponse({ status: HttpStatus.OK, type: LandingDetailResponseDto })
  async findOne(@Param('id') id: string): Promise<LandingDetailResponseDto> {
    const landing = await this.landingService.findOne(+id);

    return {
      title: landing.title,
      content: landing.content,
      reviews: (landing.reviews || []).map((r) => ({
        name: r.name,
        comment: r.comment,
        rating: r.rating,
      })),
      images: (landing.imagesProduct || []).map((i) => ({
        url: i.url,
        title: i.title,
        description: i.description,
        price: i.price,
      })),
      videos: (landing.videos || []).map((v) => ({
        url: v.url,
        title: v.title,
      })),
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'Update a landing page by ID' })
  @ApiResponse({ status: HttpStatus.OK, type: LandingResponseDto })
  @CheckAbilities({ action: Action.Update, subject: 'Landing' })
  async update(
    @Param('id') id: string,
    @Body() updateLandingDto: UpdateLandingDto,
  ): Promise<LandingResponseDto> {
    const landing = await this.landingService.update(+id, updateLandingDto);
    return { message: 'Landing berhasil diperbarui.', landing };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'Delete a landing page by ID' })
  @ApiResponse({ status: HttpStatus.OK, type: SuccessResponseDto })
  @CheckAbilities({ action: Action.Delete, subject: 'Landing' })
  async remove(@Param('id') id: string): Promise<SuccessResponseDto> {
    await this.landingService.remove(+id);
    return { message: 'Landing berhasil dihapus.' };
  }
}
