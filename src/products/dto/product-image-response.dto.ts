import { ApiProperty } from '@nestjs/swagger';
import { ProductImage } from '@prisma/client';

export class ProductImageResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  image: ProductImage;
}
