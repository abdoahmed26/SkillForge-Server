import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Brackets, MoreThan, Repository } from 'typeorm';
import { UserSkill } from '../skills/entities/user-skill.entity';
import { User } from '../users/entities/user.entity';
import { Match, SkillOverlapData } from './entities/match.entity';
import { SkippedMatch } from './entities/skipped-match.entity';
import { MatchStatus } from './enums/match.enums';
import { computeCompatibilityScore } from './matching.algorithm';
import { MatchingGateway } from './matching.gateway';

const MIN_COMPATIBILITY_SCORE = 15;
const SKIP_EXPIRY_DAYS = 7;

type DiscoverCandidateResult = {
  userId: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  averageRating: number;
  totalReviewCount: number;
  compatibilityScore: number;
  canTeachMe: SkillOverlapData['canTeachMe'];
  canLearnFromMe: SkillOverlapData['canLearnFromMe'];
};

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
    @InjectRepository(SkippedMatch)
    private readonly skippedMatchesRepository: Repository<SkippedMatch>,
    @InjectRepository(UserSkill)
    private readonly userSkillsRepository: Repository<UserSkill>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly matchingGateway: MatchingGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async discover(userId: string, limit = 10) {
    const currentSkills = await this.getUserSkills(userId);
    const skipCutoff = new Date(Date.now() - SKIP_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const [users, existingMatches, skippedMatches] = await Promise.all([
      this.usersRepository.find(),
      this.matchesRepository
        .createQueryBuilder('match')
        .where('match."userAId" = :userId OR match."userBId" = :userId', { userId })
        .getMany(),
      this.skippedMatchesRepository.find({
        where: { skippedById: userId, createdAt: MoreThan(skipCutoff) },
      }),
    ]);

    const interactedUserIds = new Set<string>();
    existingMatches.forEach((match) => {
      interactedUserIds.add(match.userAId === userId ? match.userBId : match.userAId);
    });
    skippedMatches.forEach((skip) => interactedUserIds.add(skip.skippedUserId));

    const candidates: DiscoverCandidateResult[] = [];
    for (const user of users) {
      if (user.id === userId || interactedUserIds.has(user.id)) {
        continue;
      }

      const candidateSkills = await this.getUserSkills(user.id);
      const compatibility = computeCompatibilityScore(currentSkills, candidateSkills);
      if (compatibility.score < MIN_COMPATIBILITY_SCORE) {
        continue;
      }

      candidates.push({
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        averageRating: Number(user.averageRating ?? 0),
        totalReviewCount: user.totalReviewCount,
        compatibilityScore: compatibility.score,
        canTeachMe: compatibility.canTeachMe,
        canLearnFromMe: compatibility.canLearnFromMe,
      });
    }

    candidates.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    return {
      candidates: candidates.slice(0, limit),
      remaining: Math.max(candidates.length - limit, 0),
    };
  }

  async like(requesterId: string, targetUserId: string) {
    if (requesterId === targetUserId) {
      throw new ConflictException('You cannot match with yourself');
    }

    const target = await this.usersRepository.findOne({ where: { id: targetUserId } });
    if (!target) {
      throw new NotFoundException('Target user not found');
    }

    const [userAId, userBId] = this.getCanonicalPair(requesterId, targetUserId);
    const existing = await this.matchesRepository.findOne({
      where: { userAId, userBId },
      relations: { userA: true, userB: true, requester: true },
    });

    if (existing) {
      if (existing.status === MatchStatus.PENDING && existing.requesterId === targetUserId) {
        existing.status = MatchStatus.ACCEPTED;
        existing.respondedAt = new Date();
        const saved = await this.matchesRepository.save(existing);
        const response = this.toLikeResponse(saved, requesterId, true, "It's a match!");
        this.matchingGateway.emitMatchAccepted(saved.userAId, saved.userBId, {
          userA: this.toMatchListItem(saved, saved.userAId),
          userB: this.toMatchListItem(saved, saved.userBId),
        });
        this.eventEmitter.emit('match.accepted', {
          matchId: saved.id,
          userAId: saved.userAId,
          userBId: saved.userBId,
        });
        return response;
      }
      throw new ConflictException('You have already interacted with this user');
    }

    const compatibility = await this.computeForUsers(requesterId, targetUserId);
    const match = await this.matchesRepository.save(
      this.matchesRepository.create({
        userAId,
        userBId,
        requesterId,
        status: MatchStatus.PENDING,
        compatibilityScore: compatibility.score,
        skillOverlapData: {
          canTeachMe: compatibility.canTeachMe,
          canLearnFromMe: compatibility.canLearnFromMe,
        },
      }),
    );
    const withRelations = await this.findMatchOrFail(match.id);
    const response = this.toLikeResponse(withRelations, requesterId, false, 'Match request sent');
    this.matchingGateway.emitMatchRequest(targetUserId, this.toInboxRequest(withRelations, targetUserId));
    this.eventEmitter.emit('match.requested', {
      recipientId: targetUserId,
      requesterName: withRelations.requester.displayName ?? withRelations.requester.username,
      matchId: withRelations.id,
    });
    return response;
  }

  async skip(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new ConflictException('You cannot skip yourself');
    }
    await this.skippedMatchesRepository.upsert(
      { skippedById: userId, skippedUserId: targetUserId, createdAt: new Date() },
      ['skippedById', 'skippedUserId'],
    );
    return { message: 'User skipped' };
  }

  async getInbox(userId: string) {
    const matches = await this.matchesRepository.find({
      where: { status: MatchStatus.PENDING },
      relations: { userA: true, userB: true, requester: true },
      order: { createdAt: 'DESC' },
    });

    return {
      requests: matches
        .filter((match) => this.getResponderId(match) === userId)
        .map((match) => this.toInboxRequest(match, userId)),
    };
  }

  async acceptMatch(userId: string, matchId: string) {
    const match = await this.findMatchOrFail(matchId);
    this.assertResponder(match, userId);
    match.status = MatchStatus.ACCEPTED;
    match.respondedAt = new Date();
    const saved = await this.matchesRepository.save(match);
    const response = this.toLikeResponse(saved, userId, true, 'Match accepted!');
    this.matchingGateway.emitMatchAccepted(saved.userAId, saved.userBId, {
      userA: this.toMatchListItem(saved, saved.userAId),
      userB: this.toMatchListItem(saved, saved.userBId),
    });
    this.eventEmitter.emit('match.accepted', {
      matchId: saved.id,
      userAId: saved.userAId,
      userBId: saved.userBId,
    });
    return response;
  }

  async declineMatch(userId: string, matchId: string) {
    const match = await this.findMatchOrFail(matchId);
    this.assertResponder(match, userId);
    match.status = MatchStatus.DECLINED;
    match.respondedAt = new Date();
    const saved = await this.matchesRepository.save(match);
    return {
      matchId: saved.id,
      status: saved.status,
      respondedAt: saved.respondedAt,
    };
  }

  async getMatches(userId: string) {
    const matches = await this.matchesRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.userA', 'userA')
      .leftJoinAndSelect('match.userB', 'userB')
      .where('match.status = :status', { status: MatchStatus.ACCEPTED })
      .andWhere(
        new Brackets((qb) => {
          qb.where('match."userAId" = :userId', { userId }).orWhere(
            'match."userBId" = :userId',
            { userId },
          );
        }),
      )
      .orderBy('match.respondedAt', 'DESC')
      .getMany();

    return { matches: matches.map((match) => this.toMatchListItem(match, userId)) };
  }

  private getCanonicalPair(firstUserId: string, secondUserId: string) {
    return [firstUserId, secondUserId].sort() as [string, string];
  }

  private getResponderId(match: Match) {
    return match.userAId === match.requesterId ? match.userBId : match.userAId;
  }

  private assertResponder(match: Match, userId: string) {
    if (match.status !== MatchStatus.PENDING || this.getResponderId(match) !== userId) {
      throw new ForbiddenException('Match request cannot be changed by this user');
    }
  }

  private async findMatchOrFail(matchId: string) {
    const match = await this.matchesRepository.findOne({
      where: { id: matchId },
      relations: { userA: true, userB: true, requester: true },
    });
    if (!match) {
      throw new NotFoundException('Match request not found');
    }
    return match;
  }

  private async getUserSkills(userId: string) {
    return this.userSkillsRepository.find({ where: { userId } });
  }

  private async computeForUsers(userAId: string, userBId: string) {
    const [userASkills, userBSkills] = await Promise.all([
      this.getUserSkills(userAId),
      this.getUserSkills(userBId),
    ]);
    return computeCompatibilityScore(userASkills, userBSkills);
  }

  private getOtherUser(match: Match, userId: string) {
    return match.userAId === userId ? match.userB : match.userA;
  }

  private orientOverlap(match: Match, viewerId: string): SkillOverlapData {
    if (viewerId === match.requesterId) {
      return match.skillOverlapData;
    }
    return {
      canTeachMe: match.skillOverlapData.canLearnFromMe,
      canLearnFromMe: match.skillOverlapData.canTeachMe,
    };
  }

  private toMatchUser(user: User) {
    return {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      averageRating: Number(user.averageRating ?? 0),
      totalReviewCount: user.totalReviewCount,
    };
  }

  private toLikeResponse(match: Match, viewerId: string, isMutualMatch: boolean, message: string) {
    const overlap = this.orientOverlap(match, viewerId);
    const otherUser = this.getOtherUser(match, viewerId);
    return {
      matchId: match.id,
      status: match.status,
      compatibilityScore: match.compatibilityScore,
      isMutualMatch,
      matchedUser: isMutualMatch ? this.toMatchUser(otherUser) : undefined,
      canTeachMe: overlap.canTeachMe,
      canLearnFromMe: overlap.canLearnFromMe,
      message,
    };
  }

  private toInboxRequest(match: Match, viewerId: string) {
    const overlap = this.orientOverlap(match, viewerId);
    return {
      matchId: match.id,
      requester: this.toMatchUser(match.requester),
      compatibilityScore: match.compatibilityScore,
      canTeachMe: overlap.canTeachMe,
      canLearnFromMe: overlap.canLearnFromMe,
      createdAt: match.createdAt,
    };
  }

  private toMatchListItem(match: Match, viewerId: string) {
    return {
      matchId: match.id,
      matchedUser: this.toMatchUser(this.getOtherUser(match, viewerId)),
      compatibilityScore: match.compatibilityScore,
      skillOverlap: this.orientOverlap(match, viewerId),
      matchedAt: match.respondedAt,
    };
  }
}
