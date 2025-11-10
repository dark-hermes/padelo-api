import { ApiProperty } from '@nestjs/swagger';
import { Address } from '@prisma/client';

export class AddressResponseDto {
  @ApiProperty()
  message?: string;

  @ApiProperty({ type: Object })
  address?: Address;
}
