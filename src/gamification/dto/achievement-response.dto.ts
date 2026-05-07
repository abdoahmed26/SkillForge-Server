import { ApiProperty } from '@nestjs/swagger';

export class AchievementResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  rarityCategory: string;

  @ApiProperty()
  conditionEventType: string;

  @ApiProperty()
  conditionThreshold: number;

  @ApiProperty()
  isUnlocked: boolean;

  @ApiProperty({ nullable: true })
  unlockedAt: Date | null;

  @ApiProperty()
  currentProgress: number;

  @ApiProperty()
  rarityPercentage: number;
}
