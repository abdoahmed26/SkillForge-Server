import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('xp_transactions')
@Index('IDX_xp_transaction_user', ['userId', 'createdAt'])
@Index('IDX_xp_transaction_user_event_date', ['userId', 'eventType', 'createdAt'])
@Index('IDX_xp_transaction_user_weekly', ['userId', 'createdAt'])
export class XpTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  eventType: string;

  @Column({ type: 'int' })
  xpAmount: number;

  @Column({ type: 'int' })
  xpTotal: number;

  @Column({ type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  referenceType: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
