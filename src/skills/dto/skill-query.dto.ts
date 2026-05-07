import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ProficiencyLevel, SkillCategory, SkillType } from '../enums/skill.enums';

export enum SkillSort {
  POPULARITY = 'popularity',
  NEWEST = 'newest',
}

export class SkillQueryDto {
  @ApiPropertyOptional({
    description: 'Search term matched against skill names',
    example: 'React',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter skills by category',
    enum: SkillCategory,
    example: SkillCategory.FRONTEND,
  })
  @IsOptional()
  @IsEnum(SkillCategory)
  category?: SkillCategory;

  @ApiPropertyOptional({
    description: 'Show skills with at least one teacher or learner',
    enum: SkillType,
    example: SkillType.TEACH,
  })
  @IsOptional()
  @IsEnum(SkillType)
  type?: SkillType;

  @ApiPropertyOptional({
    description: 'Show skills connected to users at this proficiency',
    enum: ProficiencyLevel,
    example: ProficiencyLevel.INTERMEDIATE,
  })
  @IsOptional()
  @IsEnum(ProficiencyLevel)
  proficiency?: ProficiencyLevel;

  @ApiPropertyOptional({
    description: 'Sort order for marketplace results',
    enum: SkillSort,
    default: SkillSort.POPULARITY,
    example: SkillSort.POPULARITY,
  })
  @IsOptional()
  @IsEnum(SkillSort)
  sort: SkillSort = SkillSort.POPULARITY;

  @ApiPropertyOptional({
    description: 'Cursor UUID for the next page',
    example: '3b969101-f7f2-4a0f-8f34-7f66f8a9d51d',
  })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    minimum: 1,
    maximum: 50,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
