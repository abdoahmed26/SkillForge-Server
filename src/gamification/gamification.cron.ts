import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GamificationGateway } from './gamification.gateway';
import { StreakService } from './streak.service';

@Injectable()
export class GamificationCron {
  constructor(
    private readonly streakService: StreakService,
    private readonly gamificationGateway: GamificationGateway,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async emitStreakWarnings() {
    const warnings = await this.streakService.getUsersAtRisk();
    for (const { userId, warning } of warnings) {
      this.gamificationGateway.emitStreakWarning(userId, warning);
    }
  }
}
