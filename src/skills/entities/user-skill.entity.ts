import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ProficiencyLevel, SkillType } from '../enums/skill.enums';
import { Skill } from './skill.entity';

@Entity('user_skills')
@Unique('UQ_user_skill_type', ['userId', 'skillId', 'type'])
@Index('IDX_user_skill_user', ['userId'])
@Index('IDX_user_skill_skill', ['skillId'])
@Index('IDX_user_skill_type', ['type'])
export class UserSkill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  skillId: string;

  @Column({ type: 'enum', enum: SkillType })
  type: SkillType;

  @Column({ type: 'enum', enum: ProficiencyLevel })
  proficiency: ProficiencyLevel;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Skill, (skill) => skill.userSkills, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'skillId' })
  skill: Skill;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
