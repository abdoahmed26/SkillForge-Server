import { ApiProperty } from '@nestjs/swagger';

export class UserGamificationResponseDto {
  @ApiProperty()
  xp: number;

  @ApiProperty()
  level: number;

  @ApiProperty()
  nextLevelXp: number;

  @ApiProperty()
  levelProgress: number;

  @ApiProperty()
  currentStreak: number;

  @ApiProperty({ nullable: true })
  lastActiveDate: string | null;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  totalSessions: number;

  @ApiProperty()
  totalAchievements: number;

  @ApiProperty()
  totalAchievementsAvailable: number;
}
