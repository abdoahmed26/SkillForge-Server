import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Match } from '../../matching/entities/match.entity';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.entity';

@Entity('conversations')
@Unique('UQ_conversation_match', ['matchId'])
@Index('IDX_conversation_participant_one', ['participantOneId', 'lastMessageAt'])
@Index('IDX_conversation_participant_two', ['participantTwoId', 'lastMessageAt'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  matchId: string;

  @Column({ type: 'uuid' })
  participantOneId: string;

  @Column({ type: 'uuid' })
  participantTwoId: string;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastMessagePreview: string | null;

  @Column({ type: 'int', default: 0 })
  unreadCountOne: number;

  @Column({ type: 'int', default: 0 })
  unreadCountTwo: number;

  @ManyToOne(() => Match, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'matchId' })
  match: Match;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participantOneId' })
  participantOne: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participantTwoId' })
  participantTwo: User;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;
}
