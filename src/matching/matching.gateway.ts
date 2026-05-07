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
@WebSocketGateway({ namespace: '/matching', cors: { origin: '*' } })
export class MatchingGateway implements OnGatewayConnection {
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

  emitMatchRequest(responderId: string, payload: unknown) {
    this.server.to(`user:${responderId}`).emit('match:request-received', payload);
  }

  emitMatchAccepted(
    userAId: string,
    userBId: string,
    payload: unknown | { userA: unknown; userB: unknown },
  ) {
    if (payload && typeof payload === 'object' && 'userA' in payload && 'userB' in payload) {
      this.server.to(`user:${userAId}`).emit('match:accepted', payload.userA);
      this.server.to(`user:${userBId}`).emit('match:accepted', payload.userB);
      return;
    }
    this.server.to(`user:${userAId}`).emit('match:accepted', payload);
    this.server.to(`user:${userBId}`).emit('match:accepted', payload);
  }
}
