import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ProficiencyLevel, SkillType } from '../enums/skill.enums';

export class UpdateUserSkillDto {
  @ApiPropertyOptional({
    description: 'Updated proficiency level',
    enum: ProficiencyLevel,
    example: ProficiencyLevel.EXPERT,
  })
  @IsOptional()
  @IsEnum(ProficiencyLevel)
  proficiency?: ProficiencyLevel;

  @ApiPropertyOptional({
    description: 'Updated skill intent',
    enum: SkillType,
    example: SkillType.LEARN,
  })
  @IsOptional()
  @IsEnum(SkillType)
  type?: SkillType;
}
