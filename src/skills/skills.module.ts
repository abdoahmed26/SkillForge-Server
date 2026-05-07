import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkillSuggestion } from './entities/skill-suggestion.entity';
import { Skill } from './entities/skill.entity';
import { UserSkill } from './entities/user-skill.entity';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { UserSkillsController } from './user-skills.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Skill, UserSkill, SkillSuggestion])],
  controllers: [SkillsController, UserSkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
