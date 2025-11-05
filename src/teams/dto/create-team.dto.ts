import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'John Doe', description: 'Name of the team member' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Frontend Engineer', description: 'Position / role' })
  @IsString()
  @IsNotEmpty()
  position: string;

  @ApiProperty({
    example: './uploads/teams/john.jpg',
    description: 'Local image path',
    required: false,
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    example: 'https://www.linkedin.com/in/johndoe',
    description: 'Linkedin profile URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  linkedin?: string;
}
