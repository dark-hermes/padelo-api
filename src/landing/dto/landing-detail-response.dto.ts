import { ApiProperty } from '@nestjs/swagger';

class LandingReviewDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  comment: string;

  @ApiProperty()
  rating: number;
}

class LandingImageDto {
  @ApiProperty()
  url: string;

  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  price?: string;
}

class LandingVideoDto {
  @ApiProperty()
  url: string;

  @ApiProperty({ required: false })
  title?: string;
}

export class LandingDetailResponseDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: [LandingReviewDto] })
  reviews: LandingReviewDto[];

  @ApiProperty({ type: [LandingImageDto] })
  images: LandingImageDto[];

  @ApiProperty({ type: [LandingVideoDto] })
  videos: LandingVideoDto[];
}
