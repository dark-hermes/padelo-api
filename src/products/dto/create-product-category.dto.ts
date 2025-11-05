import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateProductCategoryDto {
  @ApiProperty({
    example: 'Electronics',
    description: 'Category name',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'electronics',
    description: 'URL-friendly slug for the category',
  })
  @IsNotEmpty()
  @IsString()
  slug: string;
}
