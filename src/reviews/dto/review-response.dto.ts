import { ApiProperty } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  reviewerId: string;

  @ApiProperty()
  reviewedUserId: string;

  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  reviewerRole: 'teacher' | 'learner';

  @ApiProperty()
  rating: number;

  @ApiProperty({ nullable: true })
  text: string | null;

  @ApiProperty()
  createdAt: Date;
}
