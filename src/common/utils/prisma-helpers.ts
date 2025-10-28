import { Prisma } from '@prisma/client';
import { FilterSearchQueryDto } from '../dto/filter-search-query.dto';

/**
 * Creates a Prisma 'where' clause from filter and search queries.
 * @param query - The DTO containing search and filter parameters.
 * @param searchableFields - An array of fields to apply the broad search to.
 * @returns A Prisma 'where' object.
 */
export function createPrismaWhereClause<T extends Record<string, unknown>>(
  query: FilterSearchQueryDto,
  searchableFields: string[],
): T {
  const { search, filter } = query;
  const conditions: Array<Record<string, unknown>> = [];

  if (search && searchableFields.length > 0) {
    conditions.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: search,
          mode: 'insensitive', // Case-insensitive search
        },
      })),
    });
  }

  if (filter) {
    const [field, value] = filter.split(':');
    if (field && value) {
      conditions.push({
        [field]: {
          equals: value,
        },
      });
    }
  }

  if (conditions.length === 0) {
    return {} as T;
  }

  if (conditions.length === 1) {
    return conditions[0] as T;
  }

  return { AND: conditions } as unknown as T;
}

/**
 * Creates a Prisma 'orderBy' clause from a sortBy string.
 * @param sortBy - The string in "field:direction" format.
 * @returns A Prisma 'orderBy' object or undefined.
 */
export function createPrismaOrderByClause(
  sortBy?: string,
): Prisma.JsonObject | undefined {
  if (!sortBy) {
    return undefined;
  }

  const [field, direction] = sortBy.split(':');
  if (field && (direction === 'asc' || direction === 'desc')) {
    return { [field]: direction };
  }

  return undefined;
}
