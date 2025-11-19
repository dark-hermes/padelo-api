import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

class StoreOrderItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  productVariantName?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  productPrice: number;

  @ApiProperty({ description: 'Weight in grams' })
  @Type(() => Number)
  @IsNumber()
  productWeight: number;

  @ApiProperty({ description: 'Width (cm)' })
  @Type(() => Number)
  @IsNumber()
  productWidth: number;

  @ApiProperty({ description: 'Height (cm)' })
  @Type(() => Number)
  @IsNumber()
  productHeight: number;

  @ApiProperty({ description: 'Length (cm)' })
  @Type(() => Number)
  @IsNumber()
  productLength: number;

  @ApiProperty({ description: 'Quantity' })
  @Type(() => Number)
  @IsPositive()
  qty: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  subtotal: number;
}

export class StoreOrderDto {
  @ApiProperty({ example: '2025-08-14' })
  @IsDateString()
  orderDate: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  brandName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shipperName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shipperPhone: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  shipperDestinationId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shipperAddress: string;

  @ApiProperty()
  @IsEmail()
  shipperEmail: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  originPinPoint?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  receiverName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  receiverPhone: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  receiverDestinationId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  receiverAddress: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  destinationPinPoint?: string;

  @ApiProperty({ description: 'Courier name e.g. NINJA' })
  @IsString()
  @IsNotEmpty()
  shipping: string;

  @ApiProperty({ description: 'Courier service type e.g. Standard' })
  @IsString()
  @IsNotEmpty()
  shippingType: string;

  @ApiProperty({ description: 'Payment method e.g. BANK TRANSFER' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiProperty({ description: 'Shipping cost' })
  @Type(() => Number)
  @IsNumber()
  shippingCost: number;

  @ApiProperty({ description: 'Shipping cashback', default: 0 })
  @Type(() => Number)
  @IsNumber()
  shippingCashback: number;

  @ApiProperty({ description: 'Service fee', default: 0 })
  @Type(() => Number)
  @IsNumber()
  serviceFee: number;

  @ApiProperty({ description: 'Additional cost', default: 0 })
  @Type(() => Number)
  @IsNumber()
  additionalCost: number;

  @ApiProperty({ description: 'Grand total payment' })
  @Type(() => Number)
  @IsNumber()
  grandTotal: number;

  @ApiProperty({ description: 'COD value', default: 0 })
  @Type(() => Number)
  @IsNumber()
  codValue: number;

  @ApiProperty({ description: 'Insurance value', default: 0 })
  @Type(() => Number)
  @IsNumber()
  insuranceValue: number;

  @ApiProperty({ type: [StoreOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreOrderItemDto)
  orderDetails: StoreOrderItemDto[];
}
