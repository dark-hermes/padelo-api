import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class FilterSearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for a broad search across multiple fields.',
    example: 'admin',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by a specific field in "field:value" format.',
    example: 'name:ADMIN',
  })
  @IsOptional()
  @IsString()
  filter?: string;

  @ApiPropertyOptional({
    description:
      'Sort by a specific field in "field:direction" format (asc or desc).',
    example: 'name:asc',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_]+:(asc|desc)$/, {
    message:
      'sortBy must be in the format "field:direction" (e.g., "createdAt:desc")',
  })
  sortBy?: string;
}
