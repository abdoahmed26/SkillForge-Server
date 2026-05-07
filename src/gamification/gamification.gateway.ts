import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

type JwtPayload = {
  sub: string;
};

type AuthenticatedSocket = Socket & {
  userId?: string;
};

@Injectable()
@WebSocketGateway({ namespace: '/gamification', cors: { origin: '*' } })
export class GamificationGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(@ConnectedSocket() client: AuthenticatedSocket) {
    const token =
      client.handshake.auth?.token ??
      client.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET') ?? 'development-secret',
      });
      client.userId = payload.sub;
      await client.join(`user:${payload.sub}`);
    } catch {
      throw new UnauthorizedException();
    }
  }

  emitAchievementUnlocked(userId: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit('gamification:achievement_unlocked', payload);
  }

  emitXpGained(userId: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit('gamification:xp_gained', payload);
  }

  emitStreakUpdated(userId: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit('gamification:streak_updated', payload);
  }

  emitStreakWarning(userId: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit('gamification:streak_warning', payload);
  }
}
