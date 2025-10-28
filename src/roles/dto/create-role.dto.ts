import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    example: 'EDITOR',
    description: 'The name of the role',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: ['permission-id-1', 'permission-id-2'],
    description: 'List of permission IDs to assign to the role',
  })
  @IsArray()
  permissionIds: string[];
}
