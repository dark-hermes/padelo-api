import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

export class PrintLabelDto {
  @ApiProperty({
    description: 'Label page template',
    example: 'page_5',
    required: false,
  })
  @IsString()
  @IsOptional()
  page?: string;

  @ApiProperty({
    type: [String],
    description: 'List of order numbers to print',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderNos: string[];
}
