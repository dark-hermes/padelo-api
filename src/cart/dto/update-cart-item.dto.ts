import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({ description: 'New quantity (>= 1)' })
  @IsInt()
  @IsPositive()
  @Min(1)
  quantity: number;
}
