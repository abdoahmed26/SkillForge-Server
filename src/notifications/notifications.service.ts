import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async createNotification(
    recipientId: string,
    type: NotificationType,
    title: string,
    description: string,
    referenceId?: string,
    referenceType?: string,
  ) {
    const notification = await this.notificationsRepository.save(
      this.notificationsRepository.create({
        recipientId,
        type,
        title,
        description,
        referenceId: referenceId ?? null,
        referenceType: referenceType ?? null,
      }),
    );
    const unreadCount = await this.getUnreadCount(recipientId);
    this.notificationsGateway.emitNotification(recipientId, notification);
    this.notificationsGateway.emitUnreadCount(recipientId, unreadCount);
    return notification;
  }

  async getNotifications(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const where = unreadOnly ? { recipientId: userId, isRead: false } : { recipientId: userId };
    const [notifications, total] = await this.notificationsRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    const unreadCount = await this.getUnreadCount(userId);
    return {
      notifications,
      unreadCount,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  getUnreadCount(userId: string) {
    return this.notificationsRepository.count({ where: { recipientId: userId, isRead: false } });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId, recipientId: userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    notification.isRead = true;
    const saved = await this.notificationsRepository.save(notification);
    this.notificationsGateway.emitUnreadCount(userId, await this.getUnreadCount(userId));
    return saved;
  }

  async markAllAsRead(userId: string) {
    const result = await this.notificationsRepository.update(
      { recipientId: userId, isRead: false },
      { isRead: true },
    );
    this.notificationsGateway.emitUnreadCount(userId, 0);
    return { updatedCount: result.affected ?? 0, unreadCount: 0 };
  }

  async deleteOlderThan(days: number) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.notificationsRepository.delete({ createdAt: LessThan(cutoff) });
  }

  @OnEvent('match.requested')
  handleMatchRequested(payload: { recipientId: string; requesterName?: string; matchId: string }) {
    return this.createNotification(
      payload.recipientId,
      NotificationType.MATCH_REQUEST,
      'New Match Request',
      `${payload.requesterName ?? 'Someone'} wants to exchange skills with you`,
      payload.matchId,
      'match',
    );
  }

  @OnEvent('match.accepted')
  handleMatchAccepted(payload: { recipientId?: string; userAId?: string; userBId?: string; matchId: string }) {
    const ids = [payload.recipientId, payload.userAId, payload.userBId].filter(Boolean) as string[];
    return Promise.all(
      ids.map((id) =>
        this.createNotification(
          id,
          NotificationType.MATCH_ACCEPTED,
          'Match accepted!',
          'You can now start chatting and book a session.',
          payload.matchId,
          'match',
        ),
      ),
    );
  }

  @OnEvent('session.reminder')
  handleSessionReminder(payload: { recipientId: string; sessionId: string; skillName?: string }) {
    return this.createNotification(
      payload.recipientId,
      NotificationType.SESSION_REMINDER,
      'Session in 15 minutes',
      payload.skillName ? `Your ${payload.skillName} session starts soon.` : 'Your session starts soon.',
      payload.sessionId,
      'session',
    );
  }

  @OnEvent('session.completed')
  handleSessionCompleted(payload: { recipientId: string; sessionId: string; otherUserName?: string }) {
    return this.createNotification(
      payload.recipientId,
      NotificationType.SESSION_COMPLETED,
      'Session completed!',
      `Review ${payload.otherUserName ?? 'your session partner'} when you are ready.`,
      payload.sessionId,
      'session',
    );
  }

  @OnEvent('gamification:achievement_unlocked')
  handleAchievementUnlocked(payload: { userId: string; achievementId: string; name?: string }) {
    return this.createNotification(
      payload.userId,
      NotificationType.ACHIEVEMENT_UNLOCKED,
      'Badge unlocked',
      `Badge unlocked: ${payload.name ?? 'New achievement'}`,
      payload.achievementId,
      'achievement',
    );
  }

  @OnEvent('review.submitted')
  handleReviewSubmitted(payload: { reviewedUserId: string; reviewerId: string; sessionId: string }) {
    return this.createNotification(
      payload.reviewedUserId,
      NotificationType.REVIEW_RECEIVED,
      'New review received',
      'You received a new review from your session partner.',
      payload.sessionId,
      'review',
    );
  }
}
