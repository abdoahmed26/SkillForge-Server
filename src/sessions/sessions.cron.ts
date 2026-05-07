import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { SessionStatus } from './enums/session.enums';
import { SessionsGateway } from './sessions.gateway';

@Injectable()
export class SessionsCron {
  private readonly remindedSessionIds = new Set<string>();

  constructor(
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    private readonly sessionsGateway: SessionsGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('*/15 * * * *')
  async autoCompleteSessions() {
    const sessions = await this.sessionsRepository
      .createQueryBuilder('session')
      .where('session.status = :status', { status: SessionStatus.SCHEDULED })
      .andWhere(`session."scheduledAt" + (session.duration * interval '1 minute') < :now`, {
        now: new Date(),
      })
      .getMany();
    if (sessions.length === 0) {
      return;
    }
    const savedSessions = await this.sessionsRepository.save(
      sessions.map((session) => {
        const attended = Boolean(session.teacherJoinedAt || session.learnerJoinedAt);
        return {
          ...session,
          status: attended ? SessionStatus.COMPLETED : SessionStatus.MISSED,
          completedAt: new Date(),
        };
      }),
    );

    savedSessions
      .filter((session) => session.status === SessionStatus.COMPLETED)
      .forEach((session) => this.emitSessionCompleted(session));
  }

  @Cron('* * * * *')
  async sendReminders() {
    const from = new Date(Date.now() + 14 * 60 * 1000);
    const to = new Date(Date.now() + 16 * 60 * 1000);
    const sessions = await this.sessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.teacher', 'teacher')
      .leftJoinAndSelect('session.learner', 'learner')
      .leftJoinAndSelect('session.skill', 'skill')
      .where('session.status = :status', { status: SessionStatus.SCHEDULED })
      .andWhere('session."scheduledAt" BETWEEN :from AND :to', { from, to })
      .getMany();

    for (const session of sessions) {
      if (this.remindedSessionIds.has(session.id)) {
        continue;
      }
      this.remindedSessionIds.add(session.id);
      const payload = {
        sessionId: session.id,
        skill: session.skill.name,
        scheduledAt: session.scheduledAt,
        minutesUntil: 15,
      };
      this.sessionsGateway.emitSessionReminder(session.teacherId, {
        ...payload,
        otherUser: { displayName: session.learner.displayName ?? session.learner.username },
      });
      this.sessionsGateway.emitSessionReminder(session.learnerId, {
        ...payload,
        otherUser: { displayName: session.teacher.displayName ?? session.teacher.username },
      });
    }
  }

  private emitSessionCompleted(session: Session) {
    this.eventEmitter.emit('session.completed', {
      recipientId: session.teacherId,
      sessionId: session.id,
      role: 'teacher',
    });
    this.eventEmitter.emit('session.completed', {
      recipientId: session.learnerId,
      sessionId: session.id,
      role: 'learner',
    });
  }
}
