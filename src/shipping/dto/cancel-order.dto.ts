import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({ description: 'Komerce order number e.g. KOM4227...' })
  @IsString()
  @IsNotEmpty()
  orderNo: string;
}
