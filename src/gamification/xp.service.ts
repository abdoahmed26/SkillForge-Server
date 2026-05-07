import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { XpEventType } from './enums/xp-event-type.enum';
import { XpTransaction } from './entities/xp-transaction.entity';
import { AchievementService } from './achievement.service';
import { GamificationGateway } from './gamification.gateway';

const XP_AMOUNTS = {
  SESSION_TEACH: 50,
  SESSION_LEARN: 30,
  REVIEW_5STAR: 20,
  FIRST_MATCH: 25,
} as const;

const DAILY_LIMITS: Partial<Record<XpEventType, number>> = {
  [XpEventType.SESSION_TEACH]: 5,
  [XpEventType.SESSION_LEARN]: 5,
  [XpEventType.REVIEW_5STAR]: 3,
};

@Injectable()
export class XpService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(XpTransaction)
    private readonly xpTransactionsRepository: Repository<XpTransaction>,
    private readonly achievementService: AchievementService,
    private readonly gamificationGateway: GamificationGateway,
  ) {}

  calculateLevel(xp: number) {
    return Math.max(1, Math.floor(Math.sqrt(xp / 100)));
  }

  @OnEvent('session.completed')
  async handleSessionCompleted(payload: {
    recipientId: string;
    sessionId: string;
    role?: 'teacher' | 'learner';
  }) {
    if (!payload.role) {
      return;
    }

    const eventType =
      payload.role === 'teacher' ? XpEventType.SESSION_TEACH : XpEventType.SESSION_LEARN;
    const xpAmount =
      payload.role === 'teacher' ? XP_AMOUNTS.SESSION_TEACH : XP_AMOUNTS.SESSION_LEARN;

    await this.awardXp(payload.recipientId, eventType, xpAmount, payload.sessionId, 'session');
  }

  @OnEvent('review.submitted')
  async handleReviewSubmitted(payload: {
    reviewedUserId: string;
    reviewerId: string;
    sessionId: string;
    rating: number;
  }) {
    if (payload.rating !== 5) {
      return;
    }

    await this.awardXp(
      payload.reviewedUserId,
      XpEventType.REVIEW_5STAR,
      XP_AMOUNTS.REVIEW_5STAR,
      payload.sessionId,
      'review',
    );
  }

  @OnEvent('match.accepted')
  async handleMatchAccepted(payload: { matchId: string; userAId: string; userBId: string }) {
    await Promise.all([
      this.awardFirstMatchXp(payload.userAId, payload.matchId),
      this.awardFirstMatchXp(payload.userBId, payload.matchId),
    ]);
  }

  async awardXp(
    userId: string,
    eventType: string,
    xpAmount: number,
    referenceId?: string,
    referenceType?: string,
  ) {
    if (referenceId && (await this.hasTransaction(userId, eventType, referenceId))) {
      return null;
    }

    if (!(await this.isWithinDailyLimit(userId, eventType))) {
      return null;
    }

    const user = await this.usersRepository.findOneOrFail({ where: { id: userId } });
    const xpTotal = user.xp + xpAmount;
    const level = this.calculateLevel(xpTotal);

    await this.usersRepository.update(userId, { xp: xpTotal, level });
    const transaction = await this.xpTransactionsRepository.save(
      this.xpTransactionsRepository.create({
        userId,
        eventType,
        xpAmount,
        xpTotal,
        referenceId: referenceId ?? null,
        referenceType: referenceType ?? null,
      }),
    );

    await this.achievementService.evaluateAchievements(userId, eventType);
    this.gamificationGateway.emitXpGained(userId, {
      eventType,
      xpAmount,
      xpTotal,
      level,
      leveledUp: level > user.level,
    });

    return transaction;
  }

  private async awardFirstMatchXp(userId: string, matchId: string) {
    const existing = await this.xpTransactionsRepository.findOne({
      where: { userId, eventType: XpEventType.FIRST_MATCH },
    });
    if (existing) {
      return null;
    }

    return this.awardXp(
      userId,
      XpEventType.FIRST_MATCH,
      XP_AMOUNTS.FIRST_MATCH,
      matchId,
      'match',
    );
  }

  private async hasTransaction(userId: string, eventType: string, referenceId: string) {
    return Boolean(
      await this.xpTransactionsRepository.findOne({
        where: { userId, eventType, referenceId },
      }),
    );
  }

  private async isWithinDailyLimit(userId: string, eventType: string) {
    const limit = DAILY_LIMITS[eventType as XpEventType];
    if (!limit) {
      return true;
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await this.xpTransactionsRepository.count({
      where: { userId, eventType, createdAt: MoreThan(dayAgo) },
    });

    return count < limit;
  }
}
