import { ApiProperty } from '@nestjs/swagger';

export class ConversationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  matchId: string;

  @ApiProperty()
  participant: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isOnline: boolean;
  };

  @ApiProperty({ nullable: true })
  lastMessagePreview: string | null;

  @ApiProperty({ nullable: true })
  lastMessageAt: Date | null;

  @ApiProperty()
  unreadCount: number;
}
