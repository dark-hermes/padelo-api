import { ApiProperty } from '@nestjs/swagger';
import { Product } from '@prisma/client';

export class ProductResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  product: Product;
}
