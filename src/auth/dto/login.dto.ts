import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Registered email address', example: 'test@example.com' })
  @IsEmail()
  @Transform(({ value }) => String(value).toLowerCase())
  email: string;

  @ApiProperty({ description: 'Account password', example: 'Test1234' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
