import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'Public display name',
    example: 'Ada Lovelace',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiProperty({
    description: 'Short user biography',
    example: 'I teach algorithms and want to learn design systems.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiProperty({
    description: 'Preferred app theme',
    enum: ['light', 'dark', 'system'],
    required: false,
  })
  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  themePreference?: 'light' | 'dark' | 'system';
}
