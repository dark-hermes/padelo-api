import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class KomerceWebhookDto {
  @ApiProperty({ description: 'Komerce order number' })
  @IsString()
  @IsNotEmpty()
  order_no: string;

  @ApiProperty({ description: 'Courier note / airway bill', required: false })
  @IsString()
  @IsOptional()
  cnote?: string;

  @ApiProperty({ description: 'Latest status message' })
  @IsString()
  @IsNotEmpty()
  status: string;
}
