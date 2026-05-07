import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectSessionDto {
  @ApiProperty({ example: 'I am not available at that time.', maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  comment: string;
}
