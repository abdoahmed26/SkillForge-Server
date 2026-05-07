import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions, JwtSignOptions } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSkill } from '../skills/entities/user-skill.entity';
import { User } from '../users/entities/user.entity';
import { Match } from './entities/match.entity';
import { SkippedMatch } from './entities/skipped-match.entity';
import { MatchingController } from './matching.controller';
import { MatchingGateway } from './matching.gateway';
import { MatchingService } from './matching.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, SkippedMatch, UserSkill, User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = (configService.get<string>('JWT_ACCESS_EXPIRY') ??
          '15m') as JwtSignOptions['expiresIn'];
        return {
          secret: configService.get<string>('JWT_SECRET') ?? 'development-secret',
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [MatchingController],
  providers: [MatchingService, MatchingGateway],
  exports: [MatchingService],
})
export class MatchingModule {}
