import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductCategory } from '@prisma/client';
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
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(
    createProductCategoryDto: CreateProductCategoryDto,
  ): Promise<ProductCategory> {
    // Always generate slug from category name (ignore provided slug)
    const baseName = createProductCategoryDto.name || 'category';
    const slug = await generateUniqueSlug(baseName, async (candidate) => {
      const found = await this.prisma.productCategory.findUnique({
        where: { slug: candidate },
      });
      return Boolean(found);
    });

    const dataWithoutSlug = (() => {
      const copy = {
        ...(createProductCategoryDto as unknown as Record<string, unknown>),
      };
      if ('slug' in copy) delete copy.slug;
      return copy as unknown as Omit<CreateProductCategoryDto, 'slug'>;
    })();

    return await this.prisma.productCategory.create({
      data: { ...dataWithoutSlug, slug },
    });
  }

  async findAll(
    query: FilterSearchQueryDto,
    req: RequestWithBaseUrl,
  ): Promise<PaginatedResponse<ProductCategory>> {
    const searchableFields = ['name', 'slug'];
    const whereClause = createPrismaWhereClause(query, searchableFields);
    const orderBy = createPrismaOrderByClause(query.sortBy);

    const queryArgs = {
      where: whereClause,
      orderBy,
    } as const;

    return await paginate<ProductCategory>(
      this.prisma.productCategory,
      queryArgs,
      {
        page: query.page,
        limit: query.limit,
        baseUrl: req.baseUrlFull,
      },
    );
  }

  async findOne(id: string): Promise<ProductCategory> {
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
      include: { products: true },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }

    return category;
  }

  async update(
    id: string,
    updateProductCategoryDto: UpdateProductCategoryDto,
  ): Promise<ProductCategory> {
    const existing = await this.prisma.productCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }

    // Ignore provided slug; regenerate when name changes
    const updateWithoutSlug = (() => {
      const copy = {
        ...(updateProductCategoryDto as unknown as Record<string, unknown>),
      };
      if ('slug' in copy) delete copy.slug;
      return copy as unknown as Partial<UpdateProductCategoryDto>;
    })();

    let slugToSet: string | undefined = undefined;
    if (updateProductCategoryDto.name) {
      slugToSet = await generateUniqueSlug(
        updateProductCategoryDto.name,
        async (candidate) => {
          const found = await this.prisma.productCategory.findFirst({
            where: {
              slug: candidate,
              NOT: { id },
            },
          });
          return Boolean(found);
        },
      );
    }

    const updateData = slugToSet
      ? { ...updateWithoutSlug, slug: slugToSet }
      : updateWithoutSlug;

    return await this.prisma.productCategory.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.productCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }

    await this.prisma.productCategory.delete({ where: { id } });
  }
}
