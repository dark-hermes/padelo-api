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
  UploadedFiles,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Product, ProductImage, ProductVariant } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CheckAbilities } from 'src/casl/abilities.decorator';
import { AbilitiesGuard } from 'src/casl/abilities.guard';
import { Action } from 'src/casl/casl-ability.factory';
import { FilterSearchQueryDto } from 'src/common/dto/filter-search-query.dto';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { MulterExceptionFilter } from 'src/common/filters/multer-exception.filter';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { RequestWithBaseUrl } from 'src/common/interfaces/request-with-base-url.interface';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductImageResponseDto } from './dto/product-image-response.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductVariantResponseDto } from './dto/product-variant-response.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UploadProductImagesDto } from './dto/upload-product-images.dto';
import { createProductImageMulterOptions } from './product-image-multer.config';
import { ProductsService } from './products.service';

@ApiBearerAuth()
@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard, AbilitiesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Product endpoints
  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product created successfully',
    type: ProductResponseDto,
  })
  @CheckAbilities({ action: Action.Create, subject: 'Product' })
  @HttpCode(HttpStatus.CREATED)
  async createProduct(
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.createProduct(createProductDto);
    return {
      message: 'Product berhasil dibuat.',
      product,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
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
    description: 'List of products retrieved successfully',
  })
  @CheckAbilities({ action: Action.Read, subject: 'Product' })
  findAllProducts(
    @Req() req: RequestWithBaseUrl,
    @Query() query: FilterSearchQueryDto,
  ): Promise<PaginatedResponse<Product>> {
    return this.productsService.findAllProducts(query, req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product retrieved successfully',
  })
  @CheckAbilities({ action: Action.Read, subject: 'Product' })
  findOneProduct(@Param('id') id: string): Promise<Product> {
    return this.productsService.findOneProduct(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product updated successfully',
    type: ProductResponseDto,
  })
  @CheckAbilities({ action: Action.Update, subject: 'Product' })
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.updateProduct(
      id,
      updateProductDto,
    );
    return {
      message: 'Product berhasil diperbarui.',
      product,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product deleted successfully',
    type: SuccessResponseDto,
  })
  @CheckAbilities({ action: Action.Delete, subject: 'Product' })
  async removeProduct(@Param('id') id: string): Promise<SuccessResponseDto> {
    await this.productsService.removeProduct(id);
    return { message: 'Product berhasil dihapus.' };
  }

  // Product Variant endpoints
  @Post('variants')
  @ApiOperation({ summary: 'Create a new product variant' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product variant created successfully',
    type: ProductVariantResponseDto,
  })
  @CheckAbilities({ action: Action.Create, subject: 'ProductVariant' })
  @HttpCode(HttpStatus.CREATED)
  async createProductVariant(
    @Body() createProductVariantDto: CreateProductVariantDto,
  ): Promise<ProductVariantResponseDto> {
    const variant = await this.productsService.createProductVariant(
      createProductVariantDto,
    );
    return {
      message: 'Product variant berhasil dibuat.',
      variant,
    };
  }

  @Get(':productId/variants')
  @ApiOperation({ summary: 'Get all variants for a product' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of product variants retrieved successfully',
  })
  @CheckAbilities({ action: Action.Read, subject: 'ProductVariant' })
  findAllProductVariants(
    @Param('productId') productId: string,
  ): Promise<ProductVariant[]> {
    return this.productsService.findAllProductVariants(productId);
  }

  @Get('variants/:id')
  @ApiOperation({ summary: 'Get a product variant by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product variant retrieved successfully',
  })
  @CheckAbilities({ action: Action.Read, subject: 'ProductVariant' })
  findOneProductVariant(@Param('id') id: string): Promise<ProductVariant> {
    return this.productsService.findOneProductVariant(id);
  }

  @Patch('variants/:id')
  @ApiOperation({ summary: 'Update a product variant by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product variant updated successfully',
    type: ProductVariantResponseDto,
  })
  @CheckAbilities({ action: Action.Update, subject: 'ProductVariant' })
  async updateProductVariant(
    @Param('id') id: string,
    @Body() updateProductVariantDto: UpdateProductVariantDto,
  ): Promise<ProductVariantResponseDto> {
    const variant = await this.productsService.updateProductVariant(
      id,
      updateProductVariantDto,
    );
    return {
      message: 'Product variant berhasil diperbarui.',
      variant,
    };
  }

  @Delete('variants/:id')
  @ApiOperation({ summary: 'Delete a product variant by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product variant deleted successfully',
    type: SuccessResponseDto,
  })
  @CheckAbilities({ action: Action.Delete, subject: 'ProductVariant' })
  async removeProductVariant(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto> {
    await this.productsService.removeProductVariant(id);
    return { message: 'Product variant berhasil dihapus.' };
  }

  // Product Image endpoints
  @Post('variants/:variantId/images')
  @ApiOperation({ summary: 'Upload product images (1-4 images at once)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['images'],
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Product image files (1-4)',
        },
        altText: {
          type: 'string',
          description: 'Alternative text for the images',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product images uploaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Bad request - Maximum 4 images allowed or invalid file format',
  })
  @CheckAbilities({ action: Action.Create, subject: 'ProductImage' })
  @HttpCode(HttpStatus.CREATED)
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FilesInterceptor('images', 4, createProductImageMulterOptions()),
  )
  async uploadProductImages(
    @Param('variantId') variantId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadDto: UploadProductImagesDto,
  ): Promise<{ message: string; images: ProductImage[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image file is required');
    }

    if (files.length > 4) {
      throw new BadRequestException('Maximum 4 images can be uploaded at once');
    }

    const images = await this.productsService.uploadProductImages(
      files,
      variantId,
      uploadDto.altText,
    );

    return {
      message: `${images.length} product image(s) berhasil dibuat.`,
      images,
    };
  }

  @Get('variants/:variantId/images')
  @ApiOperation({ summary: 'Get all images for a product variant' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of product images retrieved successfully',
  })
  @CheckAbilities({ action: Action.Read, subject: 'ProductImage' })
  findAllProductImages(
    @Param('variantId') variantId: string,
  ): Promise<ProductImage[]> {
    return this.productsService.findAllProductImages(variantId);
  }

  @Get('images/:id')
  @ApiOperation({ summary: 'Get a product image by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product image retrieved successfully',
  })
  @CheckAbilities({ action: Action.Read, subject: 'ProductImage' })
  findOneProductImage(@Param('id') id: string): Promise<ProductImage> {
    return this.productsService.findOneProductImage(id);
  }

  @Patch('images/:id')
  @ApiOperation({ summary: 'Update a product image by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product image updated successfully',
    type: ProductImageResponseDto,
  })
  @CheckAbilities({ action: Action.Update, subject: 'ProductImage' })
  async updateProductImage(
    @Param('id') id: string,
    @Body() updateProductImageDto: UpdateProductImageDto,
  ): Promise<ProductImageResponseDto> {
    const image = await this.productsService.updateProductImage(
      id,
      updateProductImageDto,
    );
    return {
      message: 'Product image berhasil diperbarui.',
      image,
    };
  }

  @Delete('images/:id')
  @ApiOperation({ summary: 'Delete a product image by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product image deleted successfully',
    type: SuccessResponseDto,
  })
  @CheckAbilities({ action: Action.Delete, subject: 'ProductImage' })
  async removeProductImage(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto> {
    await this.productsService.removeProductImage(id);
    return { message: 'Product image berhasil dihapus.' };
  }
}
