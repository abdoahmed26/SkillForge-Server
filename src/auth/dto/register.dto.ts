import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Unique username containing letters, numbers, underscores, or hyphens',
    example: 'testuser',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username must contain only letters, numbers, underscores, and hyphens',
  })
  username: string;

  @ApiProperty({
    description: 'Unique email address',
    example: 'test@example.com',
  })
  @IsEmail()
  @Transform(({ value }) => String(value).toLowerCase())
  email: string;

  @ApiProperty({
    description: 'Password with at least 8 characters, uppercase, lowercase, and number',
    example: 'Test1234',
  })
  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[A-Z])/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/(?=.*[a-z])/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/(?=.*\d)/, {
    message: 'Password must contain at least one number',
  })
  password: string;
}
