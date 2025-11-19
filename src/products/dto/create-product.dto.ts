import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    example: 'Smartphone X',
    description: 'Product name',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: { sections: [{ type: 'hero', content: 'Welcome' }] },
    description: 'Dynamic page content in JSON format',
  })
  @IsNotEmpty()
  pageContent: any;

  @ApiPropertyOptional({
    example: 'category-id-123',
    description: 'Category ID for the product',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
