import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { LeaderboardType } from '../enums/leaderboard-type.enum';

export class LeaderboardQueryDto {
  @IsOptional()
  @IsEnum(LeaderboardType)
  type: LeaderboardType = LeaderboardType.GLOBAL;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
