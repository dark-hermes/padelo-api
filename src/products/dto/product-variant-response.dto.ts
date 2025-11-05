import { ApiProperty } from '@nestjs/swagger';
import { ProductVariant } from '@prisma/client';

export class ProductVariantResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  variant: ProductVariant;
}
