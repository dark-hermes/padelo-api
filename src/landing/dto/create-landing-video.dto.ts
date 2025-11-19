import { ApiProperty } from '@nestjs/swagger';

export class CreateLandingVideoDto {
  @ApiProperty({ example: 'https://youtu.be/abcd' })
  url: string;

  @ApiProperty({ required: false, example: 'Intro video' })
  title?: string;
}
