import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class PickupOrderDto {
  @ApiProperty({ description: 'Komerce order number' })
  @IsString()
  @IsNotEmpty()
  orderNo: string;
}

export class PickupRequestDto {
  @ApiProperty({ description: 'Pickup date (YYYY-MM-DD)' })
  @IsDateString()
  pickupDate: string;

  @ApiProperty({ description: 'Pickup time (HH:mm)' })
  @IsString()
  @IsNotEmpty()
  pickupTime: string;

  @ApiProperty({ description: 'Pickup vehicle, e.g. Motor' })
  @IsString()
  @IsOptional()
  pickupVehicle?: string;

  @ApiProperty({ type: [PickupOrderDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PickupOrderDto)
  orders: PickupOrderDto[];
}
