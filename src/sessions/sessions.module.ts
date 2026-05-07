import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions, JwtSignOptions } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from '../matching/entities/match.entity';
import { UserSkill } from '../skills/entities/user-skill.entity';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilitySlot } from './entities/availability-slot.entity';
import { Session } from './entities/session.entity';
import { SessionsController } from './sessions.controller';
import { SessionsCron } from './sessions.cron';
import { SessionsGateway } from './sessions.gateway';
import { SessionsService } from './sessions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AvailabilitySlot, Session, Match, UserSkill]),
    ScheduleModule.forRoot(),
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
  controllers: [SessionsController, AvailabilityController],
  providers: [SessionsService, AvailabilityService, SessionsGateway, SessionsCron],
  exports: [SessionsService, AvailabilityService],
})
export class SessionsModule {}
