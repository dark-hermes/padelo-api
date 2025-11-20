import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class ShippingOptionsDto {
  @ApiProperty({ type: [String], description: 'Cart item IDs to evaluate' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  cartItemIds: string[];

  @ApiProperty({ description: 'Shipping address ID' })
  @IsString()
  @IsNotEmpty()
  addressId: string;
}
