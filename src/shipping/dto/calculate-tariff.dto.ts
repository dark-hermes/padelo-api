import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CalculateTariffDto {
  @ApiProperty({ description: 'Shipper destination ID from Komerce catalog' })
  @Type(() => Number)
  @IsNumber()
  shipperDestinationId: number;

  @ApiProperty({ description: 'Receiver destination ID from Komerce catalog' })
  @Type(() => Number)
  @IsNumber()
  receiverDestinationId: number;

  @ApiProperty({ description: 'Package weight in kilograms', example: 1 })
  @Type(() => Number)
  @IsNumber()
  weight: number;

  @ApiProperty({ description: 'Total item value (IDR)', example: 10000 })
  @Type(() => Number)
  @IsNumber()
  itemValue: number;

  @ApiProperty({ description: 'Whether shipment is COD', default: false })
  @Type(() => Boolean)
  @IsBoolean()
  cod: boolean;

  @ApiProperty({ required: false, description: 'Origin pin point coordinates' })
  @IsString()
  @IsOptional()
  originPinPoint?: string;

  @ApiProperty({
    required: false,
    description: 'Destination pin point coordinates',
  })
  @IsString()
  @IsOptional()
  destinationPinPoint?: string;
}
