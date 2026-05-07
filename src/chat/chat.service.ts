import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { Match } from '../matching/entities/match.entity';
import { MatchStatus } from '../matching/enums/match.enums';
import { User } from '../users/entities/user.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class ChatService implements OnModuleInit {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationsRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    const acceptedMatches = await this.matchesRepository.find({
      where: { status: MatchStatus.ACCEPTED },
    });
    await Promise.all(
      acceptedMatches.map((match) =>
        this.createConversation(match.id, match.userAId, match.userBId).catch(() => null),
      ),
    );
  }

  @OnEvent('match.accepted')
  async handleMatchAccepted(payload: { matchId: string; userAId: string; userBId: string }) {
    await this.createConversation(payload.matchId, payload.userAId, payload.userBId);
  }

  async createConversation(matchId: string, userOneId: string, userTwoId: string) {
    const existing = await this.conversationsRepository.findOne({ where: { matchId } });
    if (existing) {
      return existing;
    }
    return this.conversationsRepository.save(
      this.conversationsRepository.create({
        matchId,
        participantOneId: userOneId,
        participantTwoId: userTwoId,
      }),
    );
  }

  async getConversations(userId: string) {
    const conversations = await this.conversationsRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participantOne', 'participantOne')
      .leftJoinAndSelect('conversation.participantTwo', 'participantTwo')
      .where('conversation."participantOneId" = :userId', { userId })
      .orWhere('conversation."participantTwoId" = :userId', { userId })
      .orderBy('conversation.lastMessageAt', 'DESC', 'NULLS LAST')
      .getMany();

    return {
      conversations: conversations.map((conversation) =>
        this.toConversationResponse(conversation, userId),
      ),
    };
  }

  async getMessages(
    conversationId: string,
    userId: string,
    pagination: { limit?: number; before?: string; after?: string },
  ) {
    await this.requireParticipant(conversationId, userId);
    const limit = Math.min(Math.max(Number(pagination.limit ?? 50), 1), 100);
    const where: Record<string, unknown> = { conversationId };

    if (pagination.before) {
      where.createdAt = LessThan(new Date(pagination.before));
    } else if (pagination.after) {
      where.createdAt = MoreThan(new Date(pagination.after));
    }

    const messages = await this.messagesRepository.find({
      where,
      order: { createdAt: pagination.after ? 'ASC' : 'DESC' },
      take: limit + 1,
    });

    return {
      messages: messages.slice(0, limit).reverse(),
      hasMore: messages.length > limit,
    };
  }

  async sendMessage(conversationId: string, senderId: string, content: string) {
    const conversation = await this.requireParticipant(conversationId, senderId);
    const message = await this.messagesRepository.save(
      this.messagesRepository.create({ conversationId, senderId, content: content.trim() }),
    );

    const isParticipantOne = senderId === conversation.participantOneId;
    conversation.lastMessageAt = message.createdAt;
    conversation.lastMessagePreview = message.content.slice(0, 100);
    conversation.unreadCountOne += isParticipantOne ? 0 : 1;
    conversation.unreadCountTwo += isParticipantOne ? 1 : 0;
    await this.conversationsRepository.save(conversation);
    return message;
  }

  async editMessage(messageId: string, userId: string, newContent: string) {
    const message = await this.requireOwnMessage(messageId, userId);
    if (message.isDeleted) {
      throw new ForbiddenException('Deleted messages cannot be edited');
    }
    message.content = newContent.trim();
    message.isEdited = true;
    return this.messagesRepository.save(message);
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.requireOwnMessage(messageId, userId);
    message.content = '';
    message.isDeleted = true;
    return this.messagesRepository.save(message);
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.requireVisibleMessage(messageId);
    await this.requireParticipant(message.conversationId, userId);
    if (message.senderId === userId) {
      throw new ForbiddenException('You can only react to messages from other users');
    }
    const reactions = (message.reactions ?? []).filter((reaction) => reaction.userId !== userId);
    reactions.push({ userId, emoji });
    message.reactions = reactions;
    return this.messagesRepository.save(message);
  }

  async removeReaction(messageId: string, userId: string) {
    const message = await this.requireVisibleMessage(messageId);
    await this.requireParticipant(message.conversationId, userId);
    message.reactions = (message.reactions ?? []).filter((reaction) => reaction.userId !== userId);
    return this.messagesRepository.save(message);
  }

  async markAsRead(conversationId: string, userId: string) {
    const conversation = await this.requireParticipant(conversationId, userId);
    const readAt = new Date();
    await this.messagesRepository.update(
      { conversationId, senderId: conversation.participantOneId === userId ? conversation.participantTwoId : conversation.participantOneId },
      { readAt },
    );
    if (conversation.participantOneId === userId) {
      conversation.unreadCountOne = 0;
    } else {
      conversation.unreadCountTwo = 0;
    }
    await this.conversationsRepository.save(conversation);
    return { conversationId, unreadCount: 0, readAt };
  }

  async setOnline(userId: string, isOnline: boolean) {
    await this.usersRepository.update(userId, {
      isOnline,
      lastSeenAt: isOnline ? null : new Date(),
    });
  }

  async getParticipantIds(conversationId: string) {
    const conversation = await this.conversationsRepository.findOne({ where: { id: conversationId } });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return [conversation.participantOneId, conversation.participantTwoId];
  }

  private async requireParticipant(conversationId: string, userId: string) {
    const conversation = await this.conversationsRepository.findOne({
      where: [
        { id: conversationId, participantOneId: userId },
        { id: conversationId, participantTwoId: userId },
      ],
      relations: { participantOne: true, participantTwo: true },
    });
    if (!conversation) {
      throw new ForbiddenException('You cannot access this conversation');
    }
    return conversation;
  }

  private async requireOwnMessage(messageId: string, userId: string) {
    const message = await this.messagesRepository.findOne({ where: { id: messageId } });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only change your own messages');
    }
    return message;
  }

  private async requireVisibleMessage(messageId: string) {
    const message = await this.messagesRepository.findOne({ where: { id: messageId } });
    if (!message || message.isDeleted) {
      throw new NotFoundException('Message not found');
    }
    return message;
  }

  private toConversationResponse(conversation: Conversation, viewerId: string) {
    const participant =
      conversation.participantOneId === viewerId ? conversation.participantTwo : conversation.participantOne;
    return {
      id: conversation.id,
      matchId: conversation.matchId,
      participant: {
        id: participant.id,
        username: participant.username,
        displayName: participant.displayName,
        avatarUrl: participant.avatarUrl,
        isOnline: participant.isOnline,
      },
      lastMessagePreview: conversation.lastMessagePreview,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount:
        conversation.participantOneId === viewerId
          ? conversation.unreadCountOne
          : conversation.unreadCountTwo,
    };
  }
}
