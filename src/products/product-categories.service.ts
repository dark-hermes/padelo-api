import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductCategory } from '@prisma/client';
import { FilterSearchQueryDto } from 'src/common/dto/filter-search-query.dto';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { RequestWithBaseUrl } from 'src/common/interfaces/request-with-base-url.interface';
import { paginate } from 'src/common/utils/paginator';
import {
  createPrismaOrderByClause,
  createPrismaWhereClause,
} from 'src/common/utils/prisma-helpers';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(
    createProductCategoryDto: CreateProductCategoryDto,
  ): Promise<ProductCategory> {
    const existing = await this.prisma.productCategory.findUnique({
      where: { slug: createProductCategoryDto.slug },
    });

    if (existing) {
      throw new ConflictException(
        `Category with slug "${createProductCategoryDto.slug}" already exists.`,
      );
    }

    return await this.prisma.productCategory.create({
      data: createProductCategoryDto,
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

    if (updateProductCategoryDto.slug) {
      const slugExists = await this.prisma.productCategory.findFirst({
        where: {
          slug: updateProductCategoryDto.slug,
          NOT: { id },
        },
      });

      if (slugExists) {
        throw new ConflictException(
          `Category with slug "${updateProductCategoryDto.slug}" already exists.`,
        );
      }
    }

    return await this.prisma.productCategory.update({
      where: { id },
      data: updateProductCategoryDto,
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
