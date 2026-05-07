import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { EditMessageDto } from './dto/edit-message.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get current user conversations' })
  getConversations(@CurrentUser() user: User) {
    return this.chatService.getConversations(user.id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get paginated conversation messages' })
  getMessages(
    @Param('id') conversationId: string,
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
    @Query('after') after?: string,
  ) {
    return this.chatService.getMessages(conversationId, user.id, { limit, before, after });
  }

  @Patch('messages/:id')
  @ApiOperation({ summary: 'Edit a sent message' })
  editMessage(@Param('id') messageId: string, @CurrentUser() user: User, @Body() dto: EditMessageDto) {
    return this.chatService.editMessage(messageId, user.id, dto.content).then(async (message) => {
      await this.chatGateway.emitToConversation(message.conversationId, 'chat:message_edited', message);
      return message;
    });
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Soft-delete a sent message' })
  deleteMessage(@Param('id') messageId: string, @CurrentUser() user: User) {
    return this.chatService.deleteMessage(messageId, user.id).then(async (message) => {
      await this.chatGateway.emitToConversation(message.conversationId, 'chat:message_deleted', message);
      return message;
    });
  }

  @Post('messages/:id/reactions')
  @ApiOperation({ summary: 'Add an emoji reaction' })
  @ApiResponse({ status: 201 })
  addReaction(
    @Param('id') messageId: string,
    @CurrentUser() user: User,
    @Body('emoji') emoji: string,
  ) {
    return this.chatService.addReaction(messageId, user.id, emoji).then(async (message) => {
      await this.chatGateway.emitToConversation(message.conversationId, 'chat:reaction_added', {
        conversationId: message.conversationId,
        messageId,
        userId: user.id,
        emoji,
      });
      return message;
    });
  }

  @Delete('messages/:id/reactions')
  @ApiOperation({ summary: 'Remove current user reaction' })
  removeReaction(@Param('id') messageId: string, @CurrentUser() user: User) {
    return this.chatService.removeReaction(messageId, user.id).then(async (message) => {
      await this.chatGateway.emitToConversation(message.conversationId, 'chat:reaction_removed', {
        conversationId: message.conversationId,
        messageId,
        userId: user.id,
      });
      return message;
    });
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation messages as read' })
  markAsRead(@Param('id') conversationId: string, @CurrentUser() user: User) {
    return this.chatService.markAsRead(conversationId, user.id).then(async (payload) => {
      await this.chatGateway.emitToConversation(conversationId, 'chat:read', {
        conversationId,
        userId: user.id,
        readAt: payload.readAt,
      });
      return payload;
    });
  }
}
