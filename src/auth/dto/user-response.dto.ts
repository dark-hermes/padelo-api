// src/users/dto/user-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SanitizedUser } from '../auth.interface';

class UserEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;
}

export class UserResponseDto {
  @ApiProperty({
    example: 'User created successfully.',
  })
  message: string;

  @ApiProperty({ type: UserEntity })
  user: SanitizedUser;
}
