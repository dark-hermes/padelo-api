import { ApiProperty } from '@nestjs/swagger';
import { Landing } from '@prisma/client';

export class LandingResponseDto {
	@ApiProperty()
	message: string;

	@ApiProperty()
	landing: Landing;
}
