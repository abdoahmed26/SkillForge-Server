import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('achievements')
@Unique('UQ_achievement_name', ['name'])
@Index('IDX_achievement_event_type', ['conditionEventType'])
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 255 })
  icon: string;

  @Column({ type: 'varchar', length: 50 })
  conditionEventType: string;

  @Column({ type: 'int' })
  conditionThreshold: number;

  @Column({ type: 'varchar', length: 20, default: 'common' })
  rarityCategory: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
