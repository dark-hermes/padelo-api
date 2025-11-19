import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'Home', description: 'Label for the address' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: 'John Doe', description: 'Recipient name' })
  @IsString()
  @IsNotEmpty()
  recipient: string;

  @ApiProperty({ example: '08123456789', description: 'Phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Jl. Example 1', description: 'Address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Jakarta', description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'DKI Jakarta', description: 'Province' })
  @IsString()
  @IsNotEmpty()
  province: string;

  @ApiProperty({ example: '12345', description: 'Postal code' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({
    example: 123456,
    description: 'Komerce destination directory ID',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  komerceDestinationId?: number;

  @ApiProperty({
    example: '-6.200000,106.816666',
    description: 'Komerce pinpoint coordinate for courier pickup/drop',
    required: false,
  })
  @IsOptional()
  @IsString()
  komercePinPoint?: string;

  @ApiProperty({
    example: 'ckxyz...',
    description: 'Optional user id (admin only)',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
