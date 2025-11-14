import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Product, ProductImage, ProductVariant } from '@prisma/client';
import * as fs from 'fs/promises';
import { FilterSearchQueryDto } from 'src/common/dto/filter-search-query.dto';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { RequestWithBaseUrl } from 'src/common/interfaces/request-with-base-url.interface';
import { paginate } from 'src/common/utils/paginator';
import {
  createPrismaOrderByClause,
  createPrismaWhereClause,
} from 'src/common/utils/prisma-helpers';
import { generateUniqueSlug } from 'src/common/utils/slug.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // Product CRUD operations
  async createProduct(createProductDto: CreateProductDto): Promise<Product> {
    // Always generate slug from product name (ignore any provided slug)
    const baseName = createProductDto.name || 'product';
    const slug = await generateUniqueSlug(baseName, async (candidate) => {
      const found = await this.prisma.product.findUnique({
        where: { slug: candidate },
      });
      return Boolean(found);
    });

    if (createProductDto.categoryId) {
      const category = await this.prisma.productCategory.findUnique({
        where: { id: createProductDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException(
          `Category with ID "${createProductDto.categoryId}" not found.`,
        );
      }
    }

    // Ensure we don't use slug from DTO; merge generated slug into data
    const dataWithoutSlug = (() => {
      const copy = {
        ...(createProductDto as unknown as Record<string, unknown>),
      };
      if ('slug' in copy) delete copy.slug;
      return copy as unknown as Omit<CreateProductDto, 'slug'>;
    })();

    return await this.prisma.product.create({
      data: { ...dataWithoutSlug, slug },
      include: {
        category: true,
        variants: {
          include: {
            images: true,
          },
        },
      },
    });
  }

  async findAllProducts(
    query: FilterSearchQueryDto,
    req: RequestWithBaseUrl,
  ): Promise<PaginatedResponse<Product>> {
    const searchableFields = ['name', 'slug'];
    const whereClause = createPrismaWhereClause(query, searchableFields);
    const orderBy = createPrismaOrderByClause(query.sortBy);

    const queryArgs = {
      where: whereClause,
      orderBy,
      include: {
        category: true,
        variants: {
          include: {
            images: true,
          },
        },
      },
    } as const;

    return await paginate<Product>(this.prisma.product, queryArgs, {
      page: query.page,
      limit: query.limit,
      baseUrl: req.baseUrlFull,
    });
  }

  async findOneProduct(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: {
          include: {
            images: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found.`);
    }

    return product;
  }

  async updateProduct(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID "${id}" not found.`);
    }

    // Slug is generated automatically. Ignore any provided slug value.
    const updateWithoutSlug = (() => {
      const copy = {
        ...(updateProductDto as unknown as Record<string, unknown>),
      };
      if ('slug' in copy) delete copy.slug;
      return copy as unknown as Partial<UpdateProductDto>;
    })();

    // If name is being updated, regenerate slug based on new name
    let slugToSet: string | undefined = undefined;
    if (updateProductDto.name) {
      slugToSet = await generateUniqueSlug(
        updateProductDto.name,
        async (candidate) => {
          const found = await this.prisma.product.findFirst({
            where: {
              slug: candidate,
              NOT: { id },
            },
          });
          return Boolean(found);
        },
      );
    }

    if (updateProductDto.categoryId) {
      const category = await this.prisma.productCategory.findUnique({
        where: { id: updateProductDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException(
          `Category with ID "${updateProductDto.categoryId}" not found.`,
        );
      }
    }

    const updateData = slugToSet
      ? { ...updateWithoutSlug, slug: slugToSet }
      : updateWithoutSlug;

    return await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        variants: {
          include: {
            images: true,
          },
        },
      },
    });
  }

  async removeProduct(id: string): Promise<void> {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID "${id}" not found.`);
    }

    await this.prisma.product.delete({ where: { id } });
  }

  // Product Variant CRUD operations
  async createProductVariant(
    createProductVariantDto: CreateProductVariantDto,
  ): Promise<ProductVariant> {
    const product = await this.prisma.product.findUnique({
      where: { id: createProductVariantDto.productId },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID "${createProductVariantDto.productId}" not found.`,
      );
    }

    const existingSku = await this.prisma.productVariant.findUnique({
      where: { sku: createProductVariantDto.sku },
    });

    if (existingSku) {
      throw new ConflictException(
        `Product variant with SKU "${createProductVariantDto.sku}" already exists.`,
      );
    }

    return await this.prisma.productVariant.create({
      data: createProductVariantDto,
      include: {
        images: true,
      },
    });
  }

  async findAllProductVariants(productId: string): Promise<ProductVariant[]> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found.`);
    }

    return await this.prisma.productVariant.findMany({
      where: { productId },
      include: {
        images: true,
      },
    });
  }

  async findOneProductVariant(id: string): Promise<ProductVariant> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: {
        images: true,
        product: true,
      },
    });

    if (!variant) {
      throw new NotFoundException(`Product variant with ID "${id}" not found.`);
    }

    return variant;
  }

  async updateProductVariant(
    id: string,
    updateProductVariantDto: UpdateProductVariantDto,
  ): Promise<ProductVariant> {
    const existing = await this.prisma.productVariant.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Product variant with ID "${id}" not found.`);
    }

    if (updateProductVariantDto.sku) {
      const skuExists = await this.prisma.productVariant.findFirst({
        where: {
          sku: updateProductVariantDto.sku,
          NOT: { id },
        },
      });

      if (skuExists) {
        throw new ConflictException(
          `Product variant with SKU "${updateProductVariantDto.sku}" already exists.`,
        );
      }
    }

    return await this.prisma.productVariant.update({
      where: { id },
      data: updateProductVariantDto,
      include: {
        images: true,
      },
    });
  }

  async removeProductVariant(id: string): Promise<void> {
    const existing = await this.prisma.productVariant.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Product variant with ID "${id}" not found.`);
    }

    await this.prisma.productVariant.delete({ where: { id } });
  }

  // Product Image CRUD operations
  async uploadProductImages(
    files: Express.Multer.File[],
    productVariantId: string,
    altText?: string,
  ): Promise<ProductImage[]> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: productVariantId },
      include: { images: true },
    });

    if (!variant) {
      // Clean up uploaded files
      await this.cleanupUploadedFiles(files);
      throw new NotFoundException(
        `Product variant with ID "${productVariantId}" not found.`,
      );
    }

    // Check if adding these images would exceed the limit
    const totalImages = variant.images.length + files.length;
    if (totalImages > 4) {
      // Clean up uploaded files
      await this.cleanupUploadedFiles(files);
      throw new BadRequestException(
        `A product variant can have a maximum of 4 images. Current: ${variant.images.length}, Attempting to add: ${files.length}`,
      );
    }

    // Validate that at least one file is provided
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image file is required.');
    }

    // Create image records for all uploaded files
    const imagePromises = files.map((file) =>
      this.prisma.productImage.create({
        data: {
          url: file.path,
          altText: altText || `${variant.name} image`,
          productVariantId: productVariantId,
        },
      }),
    );

    return await Promise.all(imagePromises);
  }

  private async cleanupUploadedFiles(
    files: Express.Multer.File[],
  ): Promise<void> {
    if (!files || files.length === 0) return;

    for (const file of files) {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.warn(
          `Failed to cleanup uploaded file ${file.path}`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  async findAllProductImages(variantId: string): Promise<ProductImage[]> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundException(
        `Product variant with ID "${variantId}" not found.`,
      );
    }

    return await this.prisma.productImage.findMany({
      where: { productVariantId: variantId },
    });
  }

  async findOneProductImage(id: string): Promise<ProductImage> {
    const image = await this.prisma.productImage.findUnique({
      where: { id },
      include: {
        productVariant: true,
      },
    });

    if (!image) {
      throw new NotFoundException(`Product image with ID "${id}" not found.`);
    }

    return image;
  }

  async updateProductImage(
    id: string,
    updateProductImageDto: UpdateProductImageDto,
  ): Promise<ProductImage> {
    const existing = await this.prisma.productImage.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Product image with ID "${id}" not found.`);
    }

    return await this.prisma.productImage.update({
      where: { id },
      data: updateProductImageDto,
    });
  }

  async removeProductImage(id: string): Promise<void> {
    const existing = await this.prisma.productImage.findUnique({
      where: { id },
      include: { productVariant: { include: { images: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Product image with ID "${id}" not found.`);
    }

    // Check if this is the last image for the variant
    if (existing.productVariant.images.length <= 1) {
      throw new BadRequestException(
        'Cannot delete the last image. A product variant must have at least one image.',
      );
    }

    // Delete the physical file
    if (existing.url) {
      try {
        await fs.unlink(existing.url);
      } catch (error) {
        console.warn(
          `Failed to delete image file ${existing.url}`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    await this.prisma.productImage.delete({ where: { id } });
  }
}
