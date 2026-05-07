import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Session } from '../sessions/entities/session.entity';
import { SessionStatus } from '../sessions/enums/session.enums';
import { User } from '../users/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review, ReviewerRole } from './entities/review.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createReview(reviewerId: string, dto: CreateReviewDto) {
    const session = await this.sessionsRepository.findOne({
      where: { id: dto.sessionId },
      relations: { skill: true },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.status !== SessionStatus.COMPLETED) {
      throw new ForbiddenException('Only completed sessions can be reviewed');
    }
    if (session.teacherId !== reviewerId && session.learnerId !== reviewerId) {
      throw new ForbiddenException('You can only review sessions you joined');
    }

    const duplicate = await this.reviewsRepository.findOne({
      where: { reviewerId, sessionId: dto.sessionId },
    });
    if (duplicate) {
      throw new ConflictException('You have already reviewed this session');
    }
    await this.assertRateLimit(reviewerId);

    const reviewerRole: ReviewerRole = session.teacherId === reviewerId ? 'teacher' : 'learner';
    const reviewedUserId = session.teacherId === reviewerId ? session.learnerId : session.teacherId;
    const review = await this.reviewsRepository.save(
      this.reviewsRepository.create({
        reviewerId,
        reviewedUserId,
        sessionId: dto.sessionId,
        reviewerRole,
        rating: dto.rating,
        text: dto.text ?? null,
      }),
    );
    await this.updateUserAverageRating(reviewedUserId);
    if (review.rating === 5) {
      this.eventEmitter.emit('review.submitted', {
        reviewedUserId,
        reviewerId,
        sessionId: dto.sessionId,
        rating: review.rating,
      });
    }
    return review;
  }

  async getReviewsByUser(userId: string, page = 1, limit = 10) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const [reviews, total] = await this.reviewsRepository.findAndCount({
      where: { reviewedUserId: userId },
      relations: { reviewer: true, session: { skill: true } },
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    return {
      reviews: reviews.map((review) => ({
        id: review.id,
        reviewer: {
          id: review.reviewer.id,
          username: review.reviewer.username,
          displayName: review.reviewer.displayName,
          avatarUrl: review.reviewer.avatarUrl,
        },
        sessionSkill: review.session.skill.name,
        reviewerRole: review.reviewerRole,
        rating: review.rating,
        text: review.text,
        createdAt: review.createdAt,
      })),
      averageRating: Number(user?.averageRating ?? 0),
      totalReviewCount: user?.totalReviewCount ?? 0,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getReviewsBySession(sessionId: string, currentUserId: string) {
    const reviews = await this.reviewsRepository.find({ where: { sessionId } });
    return {
      reviews,
      currentUserReviewed: reviews.some((review) => review.reviewerId === currentUserId),
    };
  }

  async updateUserAverageRating(userId: string) {
    const result = await this.reviewsRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review."reviewedUserId" = :userId', { userId })
      .getRawOne<{ average: string; count: string }>();
    await this.usersRepository.update(userId, {
      averageRating: Number(result?.average ?? 0),
      totalReviewCount: Number(result?.count ?? 0),
    });
  }

  private async assertRateLimit(reviewerId: string) {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await this.reviewsRepository.find({
      where: { reviewerId, createdAt: MoreThan(dayAgo) },
      order: { createdAt: 'DESC' },
    });
    if (recent.length >= 10) {
      throw new HttpException('Review rate limit exceeded. Maximum 10 reviews per day.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const latest = recent[0];
    if (latest && Date.now() - latest.createdAt.getTime() < 30000) {
      throw new HttpException('Please wait before submitting another review.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
