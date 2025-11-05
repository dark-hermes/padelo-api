import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadProductImagesDto {
  @ApiPropertyOptional({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Product images (1-4 files)',
  })
  images?: Express.Multer.File[];

  @ApiPropertyOptional({
    example: 'Product front view',
    description: 'Alternative text for the images',
  })
  @IsOptional()
  @IsString()
  altText?: string;
}
