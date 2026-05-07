import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelSessionDto {
  @ApiProperty({ example: 'Something urgent came up.', maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  comment: string;
}
