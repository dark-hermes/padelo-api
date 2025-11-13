import { ApiProperty } from '@nestjs/swagger';

export class CreateLandingReviewDto {
	@ApiProperty({ example: 'John Doe' })
	name: string;

	@ApiProperty({ example: 'Amazing service!' })
	comment: string;

	@ApiProperty({ example: 5 })
	rating: number;
}
