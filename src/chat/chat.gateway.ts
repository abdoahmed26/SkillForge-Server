import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

type JwtPayload = { sub: string };
type AuthenticatedSocket = Socket & { userId?: string };

@Injectable()
@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly offlineTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(@ConnectedSocket() client: AuthenticatedSocket) {
    const userId = await this.authenticate(client);
    client.userId = userId;
    await client.join(`user:${userId}`);
    const timer = this.offlineTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.offlineTimers.delete(userId);
    }
    await this.chatService.setOnline(userId, true);
    this.server.emit('chat:user_online', { userId });
  }

  handleDisconnect(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return;
    }
    const userId = client.userId;
    const timer = setTimeout(async () => {
      await this.chatService.setOnline(userId, false);
      this.server.emit('chat:user_offline', { userId, lastSeenAt: new Date() });
      this.offlineTimers.delete(userId);
    }, 30000);
    this.offlineTimers.set(userId, timer);
  }

  @SubscribeMessage('chat:send_message')
  async sendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { conversationId: string; content: string },
  ) {
    if (!client.userId) return;
    const message = await this.chatService.sendMessage(body.conversationId, client.userId, body.content);
    await this.emitToConversation(body.conversationId, 'chat:message', message);
  }

  @SubscribeMessage('chat:typing')
  async typing(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() body: { conversationId: string }) {
    if (!client.userId) return;
    client.to(`conversation:${body.conversationId}`).emit('chat:typing', {
      conversationId: body.conversationId,
      userId: client.userId,
    });
  }

  @SubscribeMessage('chat:stop_typing')
  stopTyping(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() body: { conversationId: string }) {
    if (!client.userId) return;
    client.to(`conversation:${body.conversationId}`).emit('chat:stop_typing', {
      conversationId: body.conversationId,
      userId: client.userId,
    });
  }

  async emitToConversation(conversationId: string, event: string, payload: unknown) {
    const participantIds = await this.chatService.getParticipantIds(conversationId);
    participantIds.forEach((userId) => this.server.to(`user:${userId}`).emit(event, payload));
  }

  private async authenticate(client: AuthenticatedSocket) {
    const token =
      client.handshake.auth?.token ??
      client.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      client.disconnect(true);
      throw new UnauthorizedException();
    }
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.get<string>('JWT_SECRET') ?? 'development-secret',
    });
    return payload.sub;
  }
}
