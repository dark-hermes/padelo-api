// src/common/dto/success-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponseDto {
  @ApiProperty({
    description: 'A success message indicating the result of the operation.',
    example: 'Operation completed successfully.',
  })
  message: string;
}
