import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class MidtransNotificationDto {
  @ApiProperty({ description: 'Midtrans order id (invoice number)' })
  @IsString()
  order_id: string;

  @ApiProperty({ description: 'Transaction status from Midtrans' })
  @IsString()
  transaction_status: string;

  @ApiProperty({ description: 'Fraud status', required: false })
  @IsOptional()
  @IsString()
  fraud_status?: string;

  @ApiProperty({ description: 'Gross amount', required: false })
  @IsOptional()
  @IsNumberString()
  gross_amount?: string;
}
