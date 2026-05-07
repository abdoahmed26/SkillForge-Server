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

type JwtPayload = { sub: string };
type AuthenticatedSocket = Socket & { userId?: string };

@Injectable()
@WebSocketGateway({ namespace: '/sessions', cors: { origin: '*' } })
export class SessionsGateway implements OnGatewayConnection {
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

  emitSessionBooked(teacherId: string, payload: unknown) {
    this.server.to(`user:${teacherId}`).emit('session:booked', payload);
  }

  emitSessionCancelled(otherUserId: string, payload: unknown) {
    this.server.to(`user:${otherUserId}`).emit('session:cancelled', payload);
  }

  emitSessionRescheduled(otherUserId: string, payload: unknown) {
    this.server.to(`user:${otherUserId}`).emit('session:rescheduled', payload);
  }

  emitSessionReminder(userId: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit('session:reminder', payload);
  }
}
