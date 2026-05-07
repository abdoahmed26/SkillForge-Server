import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SkillCategory, SuggestionStatus } from '../enums/skill.enums';

@Entity('skill_suggestions')
@Index('IDX_suggestion_status', ['status'])
@Index('IDX_suggestion_user', ['suggestedById'])
export class SkillSuggestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  category: SkillCategory;

  @Column({ type: 'uuid' })
  suggestedById: string;

  @Column({
    type: 'enum',
    enum: SuggestionStatus,
    default: SuggestionStatus.PENDING,
  })
  status: SuggestionStatus;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'suggestedById' })
  suggestedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
