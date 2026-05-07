import { ApiProperty } from '@nestjs/swagger';

class AnalyticsStatsDto {
  @ApiProperty()
  totalSessions: number;

  @ApiProperty()
  totalTeachingHours: number;

  @ApiProperty()
  totalLearningHours: number;

  @ApiProperty()
  completionRate: number;
}

class MonthlyHoursDto {
  @ApiProperty()
  month: string;

  @ApiProperty()
  teachingHours: number;

  @ApiProperty()
  learningHours: number;
}

class SkillsRadarDto {
  @ApiProperty()
  category: string;

  @ApiProperty()
  teachCount: number;

  @ApiProperty()
  learnCount: number;
}

class ActivityHeatmapDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  activityCount: number;
}

class TopSkillDto {
  @ApiProperty()
  skillName: string;

  @ApiProperty()
  sessionCount: number;
}

export class AnalyticsResponseDto {
  @ApiProperty({ type: AnalyticsStatsDto })
  stats: AnalyticsStatsDto;

  @ApiProperty({ type: MonthlyHoursDto, isArray: true })
  teachingHoursMonthly: MonthlyHoursDto[];

  @ApiProperty({ type: SkillsRadarDto, isArray: true })
  skillsRadar: SkillsRadarDto[];

  @ApiProperty({ type: ActivityHeatmapDto, isArray: true })
  activityHeatmap: ActivityHeatmapDto[];

  @ApiProperty({ type: TopSkillDto, isArray: true })
  topSkillsTaught: TopSkillDto[];

  @ApiProperty({ type: TopSkillDto, isArray: true })
  topSkillsLearned: TopSkillDto[];
}
