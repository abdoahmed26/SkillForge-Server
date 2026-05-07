import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions, JwtSignOptions } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Review } from '../reviews/entities/review.entity';
import { Session } from '../sessions/entities/session.entity';
import { AchievementService } from './achievement.service';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { XpTransaction } from './entities/xp-transaction.entity';
import { GamificationController } from './gamification.controller';
import { GamificationGateway } from './gamification.gateway';
import { GamificationCron } from './gamification.cron';
import { StreakService } from './streak.service';
import { XpService } from './xp.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Achievement, UserAchievement, XpTransaction, User, Session, Review]),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = (configService.get<string>('JWT_ACCESS_EXPIRY') ?? '15m') as JwtSignOptions['expiresIn'];
        return {
          secret: configService.get<string>('JWT_SECRET') ?? 'development-secret',
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [GamificationController],
  providers: [AchievementService, XpService, StreakService, GamificationGateway, GamificationCron],
  exports: [AchievementService, XpService, StreakService],
})
export class GamificationModule {}
