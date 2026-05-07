import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-type.enum';

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty({ nullable: true })
  referenceId: string | null;

  @ApiProperty({ nullable: true })
  referenceType: string | null;

  @ApiProperty()
  createdAt: Date;
}
