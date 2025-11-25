import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateShippingDto {
  @ApiProperty({ description: 'Courier name (e.g. JNE REG)', required: false })
  @IsOptional()
  @IsString()
  courier?: string;

  @ApiProperty({ description: 'Tracking / airway bill number' })
  @IsString()
  @IsNotEmpty()
  trackingNumber: string;
}
