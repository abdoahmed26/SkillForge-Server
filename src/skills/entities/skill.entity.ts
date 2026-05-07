import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SkillCategory } from '../enums/skill.enums';
import { UserSkill } from './user-skill.entity';

@Entity('skills')
@Index('IDX_skill_name', ['name'], { unique: true })
@Index('IDX_skill_category', ['category'])
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  category: SkillCategory;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  iconUrl: string | null;

  @Column({ type: 'tsvector', nullable: true, select: false })
  searchVector: string | null;

  @Column({ type: 'int', default: 0 })
  teacherCount: number;

  @Column({ type: 'int', default: 0 })
  learnerCount: number;

  @OneToMany(() => UserSkill, (userSkill) => userSkill.skill)
  userSkills: UserSkill[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
