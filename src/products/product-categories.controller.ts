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
import { ProductCategory } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CheckAbilities } from 'src/casl/abilities.decorator';
import { AbilitiesGuard } from 'src/casl/abilities.guard';
import { Action } from 'src/casl/casl-ability.factory';
import { FilterSearchQueryDto } from 'src/common/dto/filter-search-query.dto';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { RequestWithBaseUrl } from 'src/common/interfaces/request-with-base-url.interface';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { ProductCategoryResponseDto } from './dto/product-category-response.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategoriesService } from './product-categories.service';

@ApiBearerAuth()
@ApiTags('Product Categories')
@Controller('product-categories')
@UseGuards(JwtAuthGuard, AbilitiesGuard)
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product category' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category created successfully',
    type: ProductCategoryResponseDto,
  })
  @CheckAbilities({ action: Action.Create, subject: 'ProductCategory' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductCategoryDto: CreateProductCategoryDto,
  ): Promise<ProductCategoryResponseDto> {
    const category = await this.productCategoriesService.create(
      createProductCategoryDto,
    );
    return {
      message: 'Product category berhasil dibuat.',
      category,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all product categories' })
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
    description: 'List of categories retrieved successfully',
  })
  @CheckAbilities({ action: Action.Read, subject: 'ProductCategory' })
  findAll(
    @Req() req: RequestWithBaseUrl,
    @Query() query: FilterSearchQueryDto,
  ): Promise<PaginatedResponse<ProductCategory>> {
    return this.productCategoriesService.findAll(query, req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product category by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category retrieved successfully',
  })
  @CheckAbilities({ action: Action.Read, subject: 'ProductCategory' })
  findOne(@Param('id') id: string): Promise<ProductCategory> {
    return this.productCategoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product category by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully',
    type: ProductCategoryResponseDto,
  })
  @CheckAbilities({ action: Action.Update, subject: 'ProductCategory' })
  async update(
    @Param('id') id: string,
    @Body() updateProductCategoryDto: UpdateProductCategoryDto,
  ): Promise<ProductCategoryResponseDto> {
    const category = await this.productCategoriesService.update(
      id,
      updateProductCategoryDto,
    );
    return {
      message: 'Product category berhasil diperbarui.',
      category,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product category by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category deleted successfully',
    type: SuccessResponseDto,
  })
  @CheckAbilities({ action: Action.Delete, subject: 'ProductCategory' })
  async remove(@Param('id') id: string): Promise<SuccessResponseDto> {
    await this.productCategoriesService.remove(id);
    return { message: 'Product category berhasil dihapus.' };
  }
}
