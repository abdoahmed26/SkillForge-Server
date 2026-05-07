import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTime } from 'luxon';
import { MoreThan, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { XpEventType } from './enums/xp-event-type.enum';
import { GamificationGateway } from './gamification.gateway';
import { XpService } from './xp.service';

type DailyActivityEvent = {
  userId: string;
};

export type StreakWarning = {
  currentStreak: number;
  hoursRemaining: number;
};

@Injectable()
export class StreakService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly xpService: XpService,
    private readonly gamificationGateway: GamificationGateway,
  ) {}

  getUserToday(timezone = 'UTC') {
    return DateTime.utc().setZone(this.toValidTimezone(timezone)).toISODate() ?? DateTime.utc().toFormat('yyyy-MM-dd');
  }

  @OnEvent('user.daily_activity')
  async handleDailyActivity(payload: DailyActivityEvent) {
    await this.updateStreak(payload.userId);
  }

  async updateStreak(userId: string) {
    const user = await this.usersRepository.findOneOrFail({ where: { id: userId } });
    const timezone = this.toValidTimezone(user.timezone);
    const today = this.getUserToday(timezone);

    if (user.lastActiveDate === today) {
      return {
        currentStreak: user.currentStreak,
        xpAwarded: 0,
        changed: false,
      };
    }

    const yesterday = DateTime.fromISO(today, { zone: timezone }).minus({ days: 1 }).toISODate();
    const currentStreak = user.lastActiveDate === yesterday ? user.currentStreak + 1 : 1;

    await this.usersRepository.update(userId, {
      currentStreak,
      lastActiveDate: today,
      streakUpdatedAt: new Date(),
    });

    const xpAwarded = currentStreak * 10;
    await this.xpService.awardXp(userId, XpEventType.STREAK, xpAwarded, undefined, 'streak');
    this.gamificationGateway.emitStreakUpdated(userId, { currentStreak, xpAwarded });

    return {
      currentStreak,
      xpAwarded,
      changed: true,
    };
  }

  async checkStreakWarning(userId: string): Promise<StreakWarning | null> {
    const user = await this.usersRepository.findOneOrFail({ where: { id: userId } });
    if (user.currentStreak <= 0) {
      return null;
    }

    const timezone = this.toValidTimezone(user.timezone);
    const now = DateTime.utc().setZone(timezone);
    const today = now.toISODate();

    if (user.lastActiveDate === today || now.hour < 18) {
      return null;
    }

    const endOfDay = now.endOf('day');
    return {
      currentStreak: user.currentStreak,
      hoursRemaining: Math.max(1, Math.ceil(endOfDay.diff(now, 'hours').hours)),
    };
  }

  async getUsersAtRisk() {
    const users = await this.usersRepository.find({ where: { currentStreak: MoreThan(0) } });
    const warnings: Array<{ userId: string; warning: StreakWarning }> = [];

    for (const user of users) {
      const warning = await this.checkStreakWarning(user.id);
      if (warning) {
        warnings.push({ userId: user.id, warning });
      }
    }

    return warnings;
  }

  private toValidTimezone(timezone?: string | null) {
    const zone = timezone || 'UTC';
    return DateTime.local().setZone(zone).isValid ? zone : 'UTC';
  }
}
