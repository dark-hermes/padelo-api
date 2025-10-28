import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

class RoleEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class RoleResponseDto {
  @ApiProperty({
    example: 'Role created successfully.',
  })
  message: string;

  @ApiProperty({ type: RoleEntity })
  role: Role;
}
