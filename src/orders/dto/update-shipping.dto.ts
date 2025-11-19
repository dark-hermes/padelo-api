import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateShippingDto {
  @ApiProperty({ description: 'Courier name (e.g. JNE REG)' })
  @IsString()
  @IsNotEmpty()
  courier: string;

  @ApiProperty({ description: 'Tracking / airway bill number' })
  @IsString()
  @IsNotEmpty()
  trackingNumber: string;
}
