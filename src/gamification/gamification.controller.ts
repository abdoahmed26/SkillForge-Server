import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AchievementService } from './achievement.service';
import { AchievementResponseDto } from './dto/achievement-response.dto';
import { XpTransaction } from './entities/xp-transaction.entity';

type GamificationUser = User & {
  lastActiveDate?: string | null;
  timezone?: string;
};

@ApiTags('Gamification')
@UseGuards(JwtAuthGuard)
@Controller('gamification')
export class GamificationController {
  constructor(
    private readonly achievementService: AchievementService,
    @InjectRepository(XpTransaction)
    private readonly xpTransactionsRepository: Repository<XpTransaction>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user gamification profile' })
  async getProfile(@CurrentUser() user: GamificationUser) {
    const [totalAchievements, totalAchievementsAvailable] = await Promise.all([
      this.achievementService.getAchievements(user.id).then((items) => items.filter((item) => item.isUnlocked).length),
      this.usersRepository.manager.getRepository('achievements').count(),
    ]);
    const nextLevelXp = Math.pow((user.level ?? 1) + 1, 2) * 100;
    const currentLevelXp = Math.pow(user.level ?? 1, 2) * 100;
    const levelRange = nextLevelXp - currentLevelXp;

    return {
      xp: user.xp,
      level: user.level,
      nextLevelXp,
      levelProgress: levelRange > 0 ? Math.min(1, (user.xp - currentLevelXp) / levelRange) : 0,
      currentStreak: user.currentStreak,
      lastActiveDate: user.lastActiveDate ?? null,
      timezone: user.timezone ?? 'UTC',
      totalSessions: await this.countSessionTransactions(user.id),
      totalAchievements,
      totalAchievementsAvailable,
    };
  }

  @Get('xp-history')
  @ApiOperation({ summary: 'Get current user XP transaction history' })
  async getXpHistory(@CurrentUser() user: User, @Query('page') page = '1', @Query('limit') limit = '20') {
    const pageNumber = Math.max(1, Number(page) || 1);
    const take = Math.min(50, Math.max(1, Number(limit) || 20));
    const [transactions, total] = await this.xpTransactionsRepository.findAndCount({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      skip: (pageNumber - 1) * take,
      take,
    });

    return {
      transactions,
      total,
      page: pageNumber,
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  @Get('achievements')
  @ApiOperation({ summary: 'Get all achievements with current user progress' })
  @ApiResponse({ type: AchievementResponseDto, isArray: true })
  async getAchievements(@CurrentUser() user: User) {
    return { achievements: await this.achievementService.getAchievements(user.id) };
  }

  @Get('achievements/:id')
  @ApiOperation({ summary: 'Get one achievement detail' })
  async getAchievementDetail(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.achievementService.getAchievementDetail(id, user.id);
  }

  private countSessionTransactions(userId: string) {
    return this.xpTransactionsRepository.count({
      where: [
        { userId, eventType: 'session_teach' },
        { userId, eventType: 'session_learn' },
      ],
    });
  }
}
