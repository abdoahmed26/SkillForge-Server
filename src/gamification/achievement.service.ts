import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../reviews/entities/review.entity';
import { Session } from '../sessions/entities/session.entity';
import { SessionStatus } from '../sessions/enums/session.enums';
import { User } from '../users/entities/user.entity';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { XpTransaction } from './entities/xp-transaction.entity';
import { XpEventType } from './enums/xp-event-type.enum';
import { GamificationGateway } from './gamification.gateway';

type AchievementView = Achievement & {
  isUnlocked: boolean;
  unlockedAt: Date | null;
  currentProgress: number;
  rarityPercentage: number;
};

@Injectable()
export class AchievementService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievementsRepository: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementsRepository: Repository<UserAchievement>,
    @InjectRepository(XpTransaction)
    private readonly xpTransactionsRepository: Repository<XpTransaction>,
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly gamificationGateway: GamificationGateway,
  ) {}

  async evaluateAchievements(userId: string, eventType: string) {
    const conditionTypes = this.toConditionEventTypes(eventType);
    const candidates = await this.achievementsRepository.find({
      where: conditionTypes.map((conditionEventType) => ({ conditionEventType })),
      order: { sortOrder: 'ASC' },
    });

    const unlocked: AchievementView[] = [];

    for (const achievement of candidates) {
      const existing = await this.userAchievementsRepository.findOne({
        where: { userId, achievementId: achievement.id },
      });

      if (existing) {
        continue;
      }

      const currentProgress = await this.countProgress(userId, achievement.conditionEventType);
      if (currentProgress < achievement.conditionThreshold) {
        continue;
      }

      const userAchievement = this.userAchievementsRepository.create({
        userId,
        achievementId: achievement.id,
      });
      const saved = await this.userAchievementsRepository.save(userAchievement);
      const rarityPercentage = await this.calculateRarityPercentage(achievement.id);
      const payload = {
        ...achievement,
        isUnlocked: true,
        unlockedAt: saved.unlockedAt,
        currentProgress,
        rarityPercentage,
      };

      unlocked.push(payload);
      this.gamificationGateway.emitAchievementUnlocked(userId, {
        achievementId: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        rarityCategory: achievement.rarityCategory,
      });
    }

    return unlocked;
  }

  async getAchievements(userId: string) {
    const achievements = await this.achievementsRepository.find({ order: { sortOrder: 'ASC' } });
    const unlocked = await this.userAchievementsRepository.find({ where: { userId } });
    const unlockedByAchievementId = new Map(
      unlocked.map((userAchievement) => [userAchievement.achievementId, userAchievement]),
    );

    return Promise.all(
      achievements.map(async (achievement) => {
        let userAchievement = unlockedByAchievementId.get(achievement.id);
        const currentProgress = await this.countProgress(userId, achievement.conditionEventType);
        if (!userAchievement && currentProgress >= achievement.conditionThreshold) {
          userAchievement = await this.userAchievementsRepository.save(
            this.userAchievementsRepository.create({ userId, achievementId: achievement.id }),
          );
          unlockedByAchievementId.set(achievement.id, userAchievement);
        }

        return {
          ...achievement,
          isUnlocked: Boolean(userAchievement),
          unlockedAt: userAchievement?.unlockedAt ?? null,
          currentProgress,
          rarityPercentage: await this.calculateRarityPercentage(achievement.id),
        };
      }),
    );
  }

  async getAchievementDetail(achievementId: string, userId: string) {
    const achievement = await this.achievementsRepository.findOne({ where: { id: achievementId } });
    if (!achievement) {
      throw new NotFoundException('Achievement not found');
    }

    const userAchievement = await this.userAchievementsRepository.findOne({
      where: { userId, achievementId },
    });
    const [totalUnlocked, totalUsers] = await Promise.all([
      this.userAchievementsRepository.count({ where: { achievementId } }),
      this.usersRepository.count(),
    ]);

    return {
      ...achievement,
      isUnlocked: Boolean(userAchievement),
      unlockedAt: userAchievement?.unlockedAt ?? null,
      currentProgress: await this.countProgress(userId, achievement.conditionEventType),
      rarityPercentage: this.toPercentage(totalUnlocked, totalUsers),
      totalUnlocked,
      totalUsers,
    };
  }

  private toConditionEventTypes(eventType: string) {
    if (eventType === XpEventType.SESSION_TEACH || eventType === XpEventType.SESSION_LEARN) {
      return [XpEventType.SESSION_COMPLETE, eventType];
    }

    if (eventType === XpEventType.STREAK) {
      return [XpEventType.STREAK_DAYS, eventType];
    }

    return [eventType];
  }

  private async countProgress(userId: string, conditionEventType: string) {
    if (conditionEventType === XpEventType.SESSION_COMPLETE) {
      return this.sessionsRepository
        .createQueryBuilder('session')
        .where('session.status = :status', { status: SessionStatus.COMPLETED })
        .andWhere('(session."teacherId" = :userId OR session."learnerId" = :userId)', { userId })
        .getCount();
    }

    if (conditionEventType === XpEventType.STREAK_DAYS) {
      const user = await this.usersRepository.findOne({ where: { id: userId } });
      return user?.currentStreak ?? 0;
    }

    if (conditionEventType === XpEventType.UNIQUE_SKILLS_TAUGHT) {
      const result = await this.sessionsRepository
        .createQueryBuilder('session')
        .select('COUNT(DISTINCT session."skillId")', 'count')
        .where('session."teacherId" = :userId', { userId })
        .andWhere('session.status = :status', { status: SessionStatus.COMPLETED })
        .getRawOne<{ count: string }>();

      return Number(result?.count ?? 0);
    }

    if (conditionEventType === XpEventType.REVIEW_5STAR) {
      return this.reviewsRepository.count({
        where: { reviewedUserId: userId, rating: 5 },
      });
    }

    return this.xpTransactionsRepository.count({ where: { userId, eventType: conditionEventType } });
  }

  private async calculateRarityPercentage(achievementId: string) {
    const [totalUnlocked, totalUsers] = await Promise.all([
      this.userAchievementsRepository.count({ where: { achievementId } }),
      this.usersRepository.count(),
    ]);

    return this.toPercentage(totalUnlocked, totalUsers);
  }

  private toPercentage(value: number, total: number) {
    if (!total) {
      return 0;
    }

    return Number(((value / total) * 100).toFixed(1));
  }
}
