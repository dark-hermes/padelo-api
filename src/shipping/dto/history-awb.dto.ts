import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class HistoryAwbDto {
  @ApiProperty({ description: 'Courier / shipping code e.g. NINJA' })
  @IsString()
  @IsNotEmpty()
  shipping: string;

  @ApiProperty({ description: 'Airway bill number' })
  @IsString()
  @IsNotEmpty()
  airwayBill: string;
}
