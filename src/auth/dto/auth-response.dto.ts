import { ApiProperty } from '@nestjs/swagger';

class AuthUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  displayName: string | null;

  @ApiProperty({ nullable: true })
  bio: string | null;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty()
  xp: number;

  @ApiProperty()
  level: number;

  @ApiProperty()
  currentStreak: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  lastLoginAt: Date | null;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;

  @ApiProperty()
  accessToken: string;
}
