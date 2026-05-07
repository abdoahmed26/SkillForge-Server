import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { ProficiencyLevel, SkillType } from '../enums/skill.enums';

export class CreateUserSkillDto {
  @ApiProperty({
    description: 'Catalog skill identifier to add to the user profile',
    example: '3b969101-f7f2-4a0f-8f34-7f66f8a9d51d',
  })
  @IsUUID()
  skillId: string;

  @ApiProperty({
    description: 'Whether the user can teach or wants to learn this skill',
    enum: SkillType,
    example: SkillType.TEACH,
  })
  @IsEnum(SkillType)
  type: SkillType;

  @ApiProperty({
    description: 'Self-reported proficiency level',
    enum: ProficiencyLevel,
    example: ProficiencyLevel.ADVANCED,
  })
  @IsEnum(ProficiencyLevel)
  proficiency: ProficiencyLevel;
}
