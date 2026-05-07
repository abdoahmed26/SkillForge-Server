import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class RescheduleSessionDto {
  @ApiProperty({ example: '2026-05-02T15:00:00Z' })
  @IsDateString()
  scheduledAt: string;
}
