import { ApiProperty } from '@nestjs/swagger';

export class CreateLandingImageDto {
  @ApiProperty({ example: '/uploads/landing/image1.jpg' })
  url: string;

  @ApiProperty({ required: false, example: 'Hero image' })
  title?: string;

  @ApiProperty({ required: false, example: 'Large hero image for the landing' })
  description?: string;

  @ApiProperty({ example: '0.00' })
  price: string;
}
