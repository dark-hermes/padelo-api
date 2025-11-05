import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateProductVariantDto {
  @ApiProperty({
    example: 'Red - 64GB',
    description: 'Variant name',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 299.99,
    description: 'Price of the variant',
  })
  @IsNotEmpty()
  @IsNumber()
  price: number;

  @ApiProperty({
    example: 'SKU-SMARTPHONE-RED-64GB',
    description: 'Stock Keeping Unit',
  })
  @IsNotEmpty()
  @IsString()
  sku: string;

  @ApiProperty({
    example: 50,
    description: 'Stock quantity',
  })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty({
    example: 0.185,
    description: 'Weight in kilograms',
  })
  @IsNotEmpty()
  @IsNumber()
  weight: number;

  @ApiProperty({
    example: 'product-id-123',
    description: 'Product ID this variant belongs to',
  })
  @IsNotEmpty()
  @IsString()
  productId: string;
}
