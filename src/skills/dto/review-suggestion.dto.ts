import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { SuggestionStatus } from '../enums/skill.enums';

export class ReviewSuggestionDto {
  @ApiProperty({
    description: 'Final review status for the suggestion',
    enum: [SuggestionStatus.APPROVED, SuggestionStatus.REJECTED],
    example: SuggestionStatus.APPROVED,
  })
  @IsIn([SuggestionStatus.APPROVED, SuggestionStatus.REJECTED])
  status: SuggestionStatus.APPROVED | SuggestionStatus.REJECTED;
}
