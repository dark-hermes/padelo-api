import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateCartItemDto {
  @ApiProperty({ description: 'Product variant ID to add to cart' })
  @IsString()
  @IsNotEmpty()
  productVariantId: string;

  @ApiPropertyOptional({
    description: 'Quantity to add (default 1)',
    example: 1,
  })
  @IsOptional()
  @IsPositive()
  @Min(1)
  quantity?: number;
}
