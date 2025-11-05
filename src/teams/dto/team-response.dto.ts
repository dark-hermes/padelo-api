import { ApiProperty } from '@nestjs/swagger';
import { Team } from '@prisma/client';

class TeamEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  position: string;

  @ApiProperty({ required: false })
  image?: string;

  @ApiProperty({ required: false })
  linkedin?: string;
}

export class TeamResponseDto {
  @ApiProperty({ example: 'Team created successfully.' })
  message: string;

  @ApiProperty({ type: TeamEntity })
  team: Team;
}
