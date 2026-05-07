import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('skipped_matches')
@Unique('UQ_skip_pair', ['skippedById', 'skippedUserId'])
@Index('IDX_skip_by', ['skippedById'])
@Index('IDX_skip_created', ['createdAt'])
export class SkippedMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  skippedById: string;

  @Column({ type: 'uuid' })
  skippedUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skippedById' })
  skippedBy: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skippedUserId' })
  skippedUser: User;

  @CreateDateColumn()
  createdAt: Date;
}
