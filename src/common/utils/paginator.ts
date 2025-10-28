import { Prisma } from '@prisma/client';
import { PaginatedResponse } from '../interfaces/pagination.interface';

type PrismaModel<T> = {
  findMany: (args: any) => Promise<T[]>;
  count: (args: any) => Promise<number>;
};

export interface PaginationOptions {
  page: number;
  limit: number;
  baseUrl?: string;
}

// Make paginate generic over the `where` type so callers can pass ItemWhereInput,
// UserWhereInput, etc., without type incompatibilities.
export async function paginate<T, Where = any>(
  model: PrismaModel<T>,
  queryArgs: {
    where?: Where;
    orderBy?: Prisma.JsonObject;
    [key: string]: any;
  } = {},
  options: PaginationOptions,
): Promise<PaginatedResponse<T>> {
  // Ensure sensible defaults in case DTO transform didn't populate them
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const baseUrl = options.baseUrl;

  const skip = (page - 1) * limit;
  const take = limit;

  const [data, totalItems] = await Promise.all([
    model.findMany({
      ...queryArgs,
      skip,
      take,
    }),
    model.count({
      where: queryArgs.where,
    }),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  const buildUrl = (p: number) =>
    baseUrl ? `${baseUrl}?page=${p}&limit=${limit}` : null;

  return {
    data,
    meta: {
      currentPage: page,
      perPage: limit,
      totalItems,
      totalPages,
    },
    links: {
      first: totalItems > 0 ? buildUrl(1) : null,
      previous: page > 1 ? buildUrl(page - 1) : null,
      next: page < totalPages ? buildUrl(page + 1) : null,
      last: totalItems > 0 ? buildUrl(totalPages) : null,
    },
  };
}
