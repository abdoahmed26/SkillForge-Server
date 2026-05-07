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
import { MatchStatus } from '../enums/match.enums';

export type SkillOverlapItem = {
  skillId?: string;
  skillName: string;
  proficiency: string;
};

export type SkillOverlapData = {
  canTeachMe: SkillOverlapItem[];
  canLearnFromMe: SkillOverlapItem[];
};

@Entity('matches')
@Unique('UQ_match_user_pair', ['userAId', 'userBId'])
@Index('IDX_match_userA', ['userAId'])
@Index('IDX_match_userB', ['userBId'])
@Index('IDX_match_status', ['status'])
@Index('IDX_match_requester', ['requesterId'])
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userAId: string;

  @Column({ type: 'uuid' })
  userBId: string;

  @Column({ type: 'uuid' })
  requesterId: string;

  @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.PENDING })
  status: MatchStatus;

  @Column({ type: 'int' })
  compatibilityScore: number;

  @Column({ type: 'jsonb' })
  skillOverlapData: SkillOverlapData;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userAId' })
  userA: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userBId' })
  userB: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
