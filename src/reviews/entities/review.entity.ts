import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Session } from '../../sessions/entities/session.entity';
import { User } from '../../users/entities/user.entity';

export type ReviewerRole = 'teacher' | 'learner';

@Entity('reviews')
@Unique('UQ_review_reviewer_session', ['reviewerId', 'sessionId'])
@Index('IDX_review_reviewed_user', ['reviewedUserId', 'createdAt'])
@Index('IDX_review_reviewer_created', ['reviewerId', 'createdAt'])
@Check('CHK_review_rating_range', '"rating" >= 1 AND "rating" <= 5')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  reviewerId: string;

  @Column({ type: 'uuid' })
  reviewedUserId: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'varchar', length: 10 })
  reviewerRole: ReviewerRole;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  text: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewerId' })
  reviewer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewedUserId' })
  reviewedUser: User;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @CreateDateColumn()
  createdAt: Date;
}
