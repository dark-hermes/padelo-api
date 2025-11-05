import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateProductImageDto {
  @ApiPropertyOptional({
    example: 'Product front view',
    description: 'Alternative text for the image',
  })
  @IsOptional()
  @IsString()
  altText?: string;
}
