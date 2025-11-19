import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Product, ProductCategory } from '@prisma/client';
import { FilterSearchQueryDto } from 'src/common/dto/filter-search-query.dto';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { RequestWithBaseUrl } from 'src/common/interfaces/request-with-base-url.interface';
import { ProductCategoriesService } from 'src/products/product-categories.service';
import { ProductsService } from 'src/products/products.service';
import { TeamsService } from 'src/teams/teams.service';

type TeamPublicDto = {
  id: string;
  name: string;
  position: string;
  image?: string | null;
  linkedin?: string | null;
};

type ProductImagePublicDto = {
  id: string;
  url: string;
  altText?: string | null;
};

type ProductVariantPublicDto = {
  id: string;
  name: string;
  price: string; // decimal as string for JSON safety
  sku: string;
  stock: number;
  weight: string; // decimal as string
  images: ProductImagePublicDto[];
};

type ProductCategoryPublicDto = {
  id: string;
  name: string;
  slug: string;
};

type ProductPublicDto = {
  id: string;
  name: string;
  slug: string;
  coverImage?: string | null;
  pageContent: unknown;
  category?: ProductCategoryPublicDto | null;
  variants: ProductVariantPublicDto[];
};

type ProductWithRelations = Product & {
  category: { id: string; name: string; slug: string } | null;
  variants: Array<{
    id: string;
    name: string;
    price: unknown;
    sku: string;
    stock: number;
    weight: unknown;
    images: Array<{ id: string; url: string; altText: string | null }>;
  }>;
};

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly productsService: ProductsService,
    private readonly categoriesService: ProductCategoriesService,
  ) {}

  private static toStringSafe(value: unknown): string {
    if (typeof value === 'string') return value;
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    )
      return String(value);
    if (
      value !== null &&
      typeof value === 'object' &&
      'toString' in value &&
      typeof (value as { toString: unknown }).toString === 'function'
    ) {
      return (value as { toString: () => string }).toString();
    }
    return '';
  }

  // Teams (public, read-only)
  @Get('teams')
  @ApiOperation({ summary: 'Public: list teams' })
  @ApiResponse({ status: 200, description: 'List of teams' })
  getTeams(
    @Req() req: RequestWithBaseUrl,
    @Query() query: FilterSearchQueryDto,
  ): Promise<PaginatedResponse<TeamPublicDto>> {
    return this.teamsService.findAll(query, req).then((res) => ({
      ...res,
      data: res.data.map(
        (t): TeamPublicDto => ({
          id: t.id,
          name: t.name,
          position: t.position,
          image: t.image ?? null,
          linkedin: t.linkedin ?? null,
        }),
      ),
    }));
  }

  @Get('teams/:id')
  @ApiOperation({ summary: 'Public: get team by id' })
  @ApiResponse({ status: 200, description: 'Team details' })
  getTeamById(@Param('id') id: string): Promise<TeamPublicDto> {
    return this.teamsService.findOne(id).then((t) => ({
      id: t.id,
      name: t.name,
      position: t.position,
      image: t.image ?? null,
      linkedin: t.linkedin ?? null,
    }));
  }

  // Products (public, read-only)
  @Get('products')
  @ApiOperation({ summary: 'Public: list products' })
  @ApiResponse({ status: 200, description: 'List of products' })
  getProducts(
    @Req() req: RequestWithBaseUrl,
    @Query() query: FilterSearchQueryDto,
  ): Promise<PaginatedResponse<ProductPublicDto>> {
    return this.productsService.findAllProducts(query, req).then((res) => ({
      ...res,
      data: res.data.map(this.mapProductPublic),
    }));
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Public: get product by id' })
  @ApiResponse({ status: 200, description: 'Product details' })
  getProductById(@Param('id') id: string): Promise<ProductPublicDto> {
    return this.productsService.findOneProduct(id).then(this.mapProductPublic);
  }

  @Get('products/slug/:slug')
  @ApiOperation({ summary: 'Public: get product by slug' })
  @ApiResponse({ status: 200, description: 'Product details' })
  getProductBySlug(@Param('slug') slug: string): Promise<ProductPublicDto> {
    return this.productsService
      .findOneProductBySlug(slug)
      .then(this.mapProductPublic);
  }

  // Product Categories (public)
  @Get('product-categories')
  @ApiOperation({ summary: 'Public: list product categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  getCategories(
    @Req() req: RequestWithBaseUrl,
    @Query() query: FilterSearchQueryDto,
  ): Promise<PaginatedResponse<ProductCategoryPublicDto>> {
    return this.categoriesService.findAll(query, req).then((res) => ({
      ...res,
      data: res.data.map(
        (c): ProductCategoryPublicDto => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
        }),
      ),
    }));
  }

  @Get('product-categories/:id')
  @ApiOperation({ summary: 'Public: get product category by id' })
  @ApiResponse({ status: 200, description: 'Category details' })
  getCategoryById(@Param('id') id: string): Promise<
    ProductCategoryPublicDto & {
      products: Array<Pick<Product, 'id' | 'name' | 'slug' | 'coverImage'>>;
    }
  > {
    return this.categoriesService
      .findOne(id)
      .then((c: ProductCategory & { products: Product[] }) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        products: (c.products || []).map((p: Product) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          coverImage: p.coverImage ?? null,
        })),
      }));
  }

  @Get('product-categories/slug/:slug')
  @ApiOperation({ summary: 'Public: get product category by slug' })
  @ApiResponse({ status: 200, description: 'Category details' })
  getCategoryBySlug(@Param('slug') slug: string): Promise<
    ProductCategoryPublicDto & {
      products: Array<Pick<Product, 'id' | 'name' | 'slug' | 'coverImage'>>;
    }
  > {
    return this.categoriesService
      .findOneBySlug(slug)
      .then((c: ProductCategory & { products: Product[] }) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        products: (c.products || []).map((p: Product) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          coverImage: p.coverImage ?? null,
        })),
      }));
  }

  private mapProductPublic = (
    p: ProductWithRelations | Product,
  ): ProductPublicDto => {
    const withRelations = p as ProductWithRelations;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      coverImage: p.coverImage ?? null,
      pageContent: p.pageContent,
      category: withRelations.category
        ? {
            id: withRelations.category.id,
            name: withRelations.category.name,
            slug: withRelations.category.slug,
          }
        : null,
      variants: (withRelations.variants || []).map((v) => {
        const priceStr = PublicController.toStringSafe(v.price);
        const weightStr = PublicController.toStringSafe(v.weight);
        return {
          id: v.id,
          name: v.name,
          price: priceStr,
          sku: v.sku,
          stock: v.stock,
          weight: weightStr,
          images: (v.images || []).map((img) => ({
            id: img.id,
            url: img.url,
            altText: img.altText ?? null,
          })),
        };
      }),
    };
  };
}
