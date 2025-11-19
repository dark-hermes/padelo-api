import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DestinationSearchDto {
  @ApiProperty({ description: 'Keyword to search Komerce destinations' })
  @IsString()
  @IsNotEmpty()
  keyword: string;
}
