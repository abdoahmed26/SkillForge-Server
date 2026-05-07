import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength } from 'class-validator';
import { SkillCategory } from '../enums/skill.enums';

export class SuggestSkillDto {
  @ApiProperty({
    description: 'Name of the skill being suggested',
    example: 'Svelte',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Category that best fits the suggested skill',
    enum: SkillCategory,
    example: SkillCategory.FRONTEND,
  })
  @IsEnum(SkillCategory)
  category: SkillCategory;
}
