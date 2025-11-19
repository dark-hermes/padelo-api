import { ApiProperty } from '@nestjs/swagger';
import { CreateLandingImageDto } from './create-landing-image.dto';
import { CreateLandingReviewDto } from './create-landing-review.dto';
import { CreateLandingVideoDto } from './create-landing-video.dto';

export class CreateLandingDto {
  @ApiProperty({
    example: 'Welcome to Padelo',
    description: 'Landing page title',
  })
  title: string;

  @ApiProperty({
    example: '<p>Some HTML content</p>',
    description: 'Landing page content',
  })
  content: string;

  @ApiProperty({ required: false, type: [CreateLandingReviewDto] })
  reviews?: CreateLandingReviewDto[];

  @ApiProperty({ required: false, type: [CreateLandingImageDto] })
  images?: CreateLandingImageDto[];

  @ApiProperty({ required: false, type: [CreateLandingVideoDto] })
  videos?: CreateLandingVideoDto[];
}
