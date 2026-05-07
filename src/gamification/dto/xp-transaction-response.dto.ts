import { ApiProperty } from '@nestjs/swagger';

export class XpTransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  eventType: string;

  @ApiProperty()
  xpAmount: number;

  @ApiProperty()
  xpTotal: number;

  @ApiProperty({ nullable: true })
  referenceId: string | null;

  @ApiProperty({ nullable: true })
  referenceType: string | null;

  @ApiProperty()
  createdAt: Date;
}
