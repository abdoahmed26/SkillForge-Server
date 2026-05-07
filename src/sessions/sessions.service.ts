import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Brackets, Repository } from 'typeorm';
import { Match } from '../matching/entities/match.entity';
import { MatchStatus } from '../matching/enums/match.enums';
import { UserSkill } from '../skills/entities/user-skill.entity';
import { SkillType } from '../skills/enums/skill.enums';
import { CancelSessionDto } from './dto/cancel-session.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { RejectSessionDto } from './dto/reject-session.dto';
import { RescheduleSessionDto } from './dto/reschedule-session.dto';
import { Session } from './entities/session.entity';
import { SessionStatus } from './enums/session.enums';
import { SessionsGateway } from './sessions.gateway';

const SESSION_MINUTES = 60;
const JOIN_GRACE_MINUTES = 10;

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
    @InjectRepository(UserSkill)
    private readonly userSkillsRepository: Repository<UserSkill>,
    private readonly sessionsGateway: SessionsGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(learnerId: string, dto: CreateSessionDto) {
    const scheduledAt = this.validateFutureTime(dto.scheduledAt);
    if (learnerId === dto.teacherId) {
      throw new BadRequestException('You cannot book a session with yourself');
    }

    const match = await this.findAcceptedMatch(learnerId, dto.teacherId);
    await this.assertTeacherOwnsSkill(dto.teacherId, dto.skillId);

    const session = await this.sessionsRepository.manager.transaction(async (manager) => {
      const conflict = await this.findConflict(
        manager.getRepository(Session),
        dto.teacherId,
        learnerId,
        scheduledAt,
        true,
      );
      if (conflict) {
        throw new ConflictException('User has booking in this time');
      }

      const created = manager.create(Session, {
        teacherId: dto.teacherId,
        learnerId,
        skillId: dto.skillId,
        matchId: match.id,
        scheduledAt,
        duration: SESSION_MINUTES,
        status: SessionStatus.PENDING,
        notes: dto.notes ?? null,
        requestedBy: learnerId,
        rejectionComment: null,
        respondedAt: null,
      });
      return manager.save(Session, created);
    });

    const fullSession = await this.getById(session.id, learnerId);
    this.sessionsGateway.emitSessionBooked(dto.teacherId, {
      sessionId: session.id,
      learnerId,
      skillId: dto.skillId,
      scheduledAt: session.scheduledAt,
      status: SessionStatus.PENDING,
    });
    return fullSession;
  }

  async getRequests(userId: string) {
    const sessions = await this.sessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.teacher', 'teacher')
      .leftJoinAndSelect('session.learner', 'learner')
      .leftJoinAndSelect('session.skill', 'skill')
      .where(
        new Brackets((statusQb) => {
          statusQb
            .where('session.status = :pending', { pending: SessionStatus.PENDING })
            .orWhere(
              'session.status = :rejected AND session."requestedBy" = :requesterId',
              { rejected: SessionStatus.REJECTED, requesterId: userId },
            );
        }),
      )
      .andWhere(
        new Brackets((qb) => {
          qb.where('session."teacherId" = :userId', { userId }).orWhere(
            'session."learnerId" = :userId',
            { userId },
          );
        }),
      )
      .orderBy('session.createdAt', 'DESC')
      .getMany();

    return { requests: sessions.map((session) => this.toSessionListItem(session, userId)) };
  }

  async accept(sessionId: string, userId: string) {
    const session = await this.findParticipantSession(sessionId, userId);
    if (session.status !== SessionStatus.PENDING) {
      throw new BadRequestException('Only pending session requests can be accepted');
    }
    if (session.requestedBy === userId) {
      throw new ForbiddenException('The sender cannot accept their own request');
    }

    const conflict = await this.findConflict(
      this.sessionsRepository,
      session.teacherId,
      session.learnerId,
      session.scheduledAt,
      false,
      session.id,
    );
    if (conflict) {
      throw new ConflictException('User has booking in this time');
    }

    session.status = SessionStatus.SCHEDULED;
    session.respondedAt = new Date();
    const saved = await this.sessionsRepository.save(session);
    this.sessionsGateway.emitSessionRescheduled(session.requestedBy ?? session.learnerId, {
      sessionId,
      status: saved.status,
      scheduledAt: saved.scheduledAt,
    });
    this.emitSessionReminderSeeds(saved);
    return this.getById(saved.id, userId);
  }

  async complete(sessionId: string, userId: string) {
    const session = await this.findParticipantSession(sessionId, userId);
    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled sessions can be completed');
    }
    session.status = SessionStatus.COMPLETED;
    session.completedAt = new Date();
    const saved = await this.sessionsRepository.save(session);
    this.emitSessionCompleted(saved);
    return this.getById(saved.id, userId);
  }

  async join(sessionId: string, userId: string) {
    const session = await this.findParticipantSession(sessionId, userId);
    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled sessions can be joined');
    }

    const now = new Date();
    const startsAt = new Date(session.scheduledAt);
    const joinOpensAt = new Date(startsAt.getTime() - JOIN_GRACE_MINUTES * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + session.duration * 60 * 1000);

    if (now < joinOpensAt) {
      throw new BadRequestException('The meeting is not open yet');
    }
    if (now > endsAt) {
      throw new BadRequestException('This session has already ended');
    }

    if (session.teacherId === userId && !session.teacherJoinedAt) {
      session.teacherJoinedAt = now;
    }
    if (session.learnerId === userId && !session.learnerJoinedAt) {
      session.learnerJoinedAt = now;
    }

    const saved = await this.sessionsRepository.save(session);
    return {
      ...(await this.getById(saved.id, userId)),
      joinUrl: this.getMeetingUrl(saved.id),
    };
  }

  async reject(sessionId: string, userId: string, dto: RejectSessionDto) {
    const session = await this.findParticipantSession(sessionId, userId);
    if (session.status !== SessionStatus.PENDING) {
      throw new BadRequestException('Only pending session requests can be rejected');
    }
    if (session.requestedBy === userId) {
      throw new ForbiddenException('The sender cannot reject their own request');
    }

    session.status = SessionStatus.REJECTED;
    session.rejectionComment = dto.comment;
    session.respondedAt = new Date();
    const saved = await this.sessionsRepository.save(session);
    this.sessionsGateway.emitSessionCancelled(session.requestedBy ?? session.learnerId, {
      sessionId,
      status: saved.status,
      rejectionComment: saved.rejectionComment,
    });
    return this.getById(saved.id, userId);
  }

  async getUpcoming(userId: string) {
    const sessions = await this.sessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.teacher', 'teacher')
      .leftJoinAndSelect('session.learner', 'learner')
      .leftJoinAndSelect('session.skill', 'skill')
      .where('session.status = :status', { status: SessionStatus.SCHEDULED })
      .andWhere(`session."scheduledAt" + (session.duration * interval '1 minute') > :now`, {
        now: new Date(),
      })
      .andWhere(
        new Brackets((qb) => {
          qb.where('session."teacherId" = :userId', { userId }).orWhere(
            'session."learnerId" = :userId',
            { userId },
          );
        }),
      )
      .orderBy('session.scheduledAt', 'ASC')
      .getMany();

    return { sessions: sessions.map((session) => this.toSessionListItem(session, userId)) };
  }

  async getHistory(userId: string, statusFilter?: SessionStatus) {
    const qb = this.sessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.teacher', 'teacher')
      .leftJoinAndSelect('session.learner', 'learner')
      .leftJoinAndSelect('session.skill', 'skill')
      .where('session.status != :scheduled', { scheduled: SessionStatus.SCHEDULED })
      .andWhere(
        new Brackets((builder) => {
          builder.where('session."teacherId" = :userId', { userId }).orWhere(
            'session."learnerId" = :userId',
            { userId },
          );
        }),
      );

    if (statusFilter) {
      qb.andWhere('session.status = :statusFilter', { statusFilter });
    }

    const sessions = await qb.orderBy('session.scheduledAt', 'DESC').getMany();
    return { sessions: sessions.map((session) => this.toSessionListItem(session, userId)) };
  }

  async getById(sessionId: string, userId: string) {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: { teacher: true, learner: true, skill: true },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.teacherId !== userId && session.learnerId !== userId) {
      throw new ForbiddenException('You cannot view this session');
    }
    return this.toSessionListItem(session, userId);
  }

  async cancel(sessionId: string, userId: string, dto: CancelSessionDto) {
    const session = await this.findParticipantSession(sessionId, userId);
    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled sessions can be cancelled');
    }
    session.status = SessionStatus.CANCELLED;
    session.cancelledBy = userId;
    session.cancellationComment = dto.comment;
    session.cancelledAt = new Date();
    const saved = await this.sessionsRepository.save(session);
    const otherUserId = session.teacherId === userId ? session.learnerId : session.teacherId;
    this.sessionsGateway.emitSessionCancelled(otherUserId, {
      sessionId,
      cancelledBy: userId,
      cancellationComment: dto.comment,
      scheduledAt: session.scheduledAt,
    });
    return this.getById(saved.id, userId);
  }

  async reschedule(sessionId: string, userId: string, dto: RescheduleSessionDto) {
    const session = await this.findParticipantSession(sessionId, userId);
    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled sessions can be rescheduled');
    }
    if (session.rescheduleCount >= 2) {
      throw new BadRequestException('Maximum reschedule limit (2) reached');
    }
    const scheduledAt = this.validateFutureTime(dto.scheduledAt);
    const conflict = await this.findConflict(
      this.sessionsRepository,
      session.teacherId,
      session.learnerId,
      scheduledAt,
      false,
      session.id,
    );
    if (conflict) {
      throw new ConflictException('Time slot conflict');
    }

    const oldTime = session.scheduledAt;
    session.scheduledAt = scheduledAt;
    session.rescheduleCount += 1;
    const saved = await this.sessionsRepository.save(session);
    const otherUserId = session.teacherId === userId ? session.learnerId : session.teacherId;
    this.sessionsGateway.emitSessionRescheduled(otherUserId, {
      sessionId,
      oldTime,
      newTime: saved.scheduledAt,
      rescheduledBy: userId,
    });
    return { id: saved.id, scheduledAt: saved.scheduledAt, rescheduleCount: saved.rescheduleCount };
  }

  private validateFutureTime(value: string) {
    const scheduledAt = new Date(value);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid scheduled time');
    }
    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Session requests must be for a future time');
    }
    return scheduledAt;
  }

  private async assertTeacherOwnsSkill(teacherId: string, skillId: string) {
    const userSkill = await this.userSkillsRepository.findOne({
      where: { userId: teacherId, skillId, type: SkillType.TEACH },
    });
    if (!userSkill) {
      throw new ForbiddenException('Teacher does not teach this skill');
    }
  }

  private async findAcceptedMatch(firstUserId: string, secondUserId: string) {
    const match = await this.matchesRepository
      .createQueryBuilder('match')
      .where('match.status = :status', { status: MatchStatus.ACCEPTED })
      .andWhere(
        new Brackets((qb) => {
          qb.where('match."userAId" = :firstUserId AND match."userBId" = :secondUserId', {
            firstUserId,
            secondUserId,
          }).orWhere('match."userAId" = :secondUserId AND match."userBId" = :firstUserId', {
            firstUserId,
            secondUserId,
          });
        }),
      )
      .getOne();
    if (!match) {
      throw new ForbiddenException('Sessions can only be booked with accepted matches');
    }
    return match;
  }

  private async findParticipantSession(sessionId: string, userId: string) {
    const session = await this.sessionsRepository.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.teacherId !== userId && session.learnerId !== userId) {
      throw new ForbiddenException('You cannot change this session');
    }
    return session;
  }

  private async findConflict(
    repository: Repository<Session>,
    teacherId: string,
    learnerId: string,
    scheduledAt: Date,
    useLock: boolean,
    excludeSessionId?: string,
  ) {
    const end = new Date(scheduledAt.getTime() + SESSION_MINUTES * 60 * 1000);
    const qb = repository
      .createQueryBuilder('session')
      .where('session.status = :status', { status: SessionStatus.SCHEDULED })
      .andWhere('session."scheduledAt" < :end', { end })
      .andWhere(`session."scheduledAt" + (session.duration * interval '1 minute') > :scheduledAt`, {
        scheduledAt,
      })
      .andWhere(
        new Brackets((builder) => {
          builder
            .where('session."teacherId" IN (:...userIds)', { userIds: [teacherId, learnerId] })
            .orWhere('session."learnerId" IN (:...userIds)', { userIds: [teacherId, learnerId] });
        }),
      );
    if (excludeSessionId) {
      qb.andWhere('session.id != :excludeSessionId', { excludeSessionId });
    }
    if (useLock) {
      qb.setLock('pessimistic_write');
    }
    return qb.getOne();
  }

  private toUser(user: Session['teacher']) {
    return {
      userId: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      username: user.username,
    };
  }

  private toSessionListItem(session: Session, viewerId: string) {
    const otherUser = session.teacherId === viewerId ? session.learner : session.teacher;
    const viewerJoinedAt =
      session.teacherId === viewerId ? session.teacherJoinedAt : session.learnerJoinedAt;
    const otherUserJoinedAt =
      session.teacherId === viewerId ? session.learnerJoinedAt : session.teacherJoinedAt;
    const viewerOutcome =
      session.status === SessionStatus.COMPLETED || session.status === SessionStatus.MISSED
        ? viewerJoinedAt
          ? 'completed'
          : 'missed'
        : null;
    return {
      id: session.id,
      otherUser: this.toUser(otherUser),
      skill: { id: session.skill.id, name: session.skill.name },
      role: session.teacherId === viewerId ? 'teacher' : 'learner',
      scheduledAt: session.scheduledAt,
      duration: session.duration,
      status: session.status,
      notes: session.notes,
      rescheduleCount: session.rescheduleCount,
      requestedBy: session.requestedBy,
      rejectionComment: session.rejectionComment,
      cancellationComment: session.cancellationComment,
      cancelledBy: session.cancelledBy,
      viewerJoinedAt,
      otherUserJoinedAt,
      viewerOutcome,
      joinUrl: this.getMeetingUrl(session.id),
    };
  }

  private getMeetingUrl(sessionId: string) {
    return `https://meet.jit.si/skillforge-${sessionId}`;
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

  private emitSessionReminderSeeds(session: Session) {
    this.eventEmitter.emit('session.reminder', {
      recipientId: session.teacherId,
      sessionId: session.id,
    });
    this.eventEmitter.emit('session.reminder', {
      recipientId: session.learnerId,
      sessionId: session.id,
    });
  }
}
