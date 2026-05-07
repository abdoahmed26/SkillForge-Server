import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Registered email address', example: 'test@example.com' })
  @IsEmail()
  @Transform(({ value }) => String(value).toLowerCase())
  email: string;
}
