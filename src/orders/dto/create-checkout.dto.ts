import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({ type: [String], description: 'Cart item IDs to checkout' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  cartItemIds: string[];

  @ApiProperty({ description: 'Shipping address ID' })
  @IsString()
  @IsNotEmpty()
  addressId: string;

  @ApiProperty({ description: 'Courier code e.g. jne, tiki, pos' })
  @IsString()
  @IsNotEmpty()
  courier: string;

  @ApiProperty({ description: 'Courier service e.g. REG, YES' })
  @IsString()
  @IsNotEmpty()
  courierService: string;

  @ApiProperty({ required: false, description: 'Checkout notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
