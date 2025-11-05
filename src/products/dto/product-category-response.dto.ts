import { ApiProperty } from '@nestjs/swagger';
import { ProductCategory } from '@prisma/client';

export class ProductCategoryResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  category: ProductCategory;
}
