import { ApiProperty } from '@nestjs/swagger';
import { MatchStatus } from '../enums/match.enums';

export class SkillOverlapItemDto {
  @ApiProperty({ description: 'Skill name', example: 'React' })
  skillName: string;

  @ApiProperty({ description: 'Teacher proficiency level', example: 'ADVANCED' })
  proficiency: string;
}

export class MatchUserDto {
  @ApiProperty({ description: 'User UUID', example: '2cfeb449-7f1d-4b87-9db4-28168e5f75dc' })
  userId: string;

  @ApiProperty({ description: 'Unique username', example: 'janedoe' })
  username: string;

  @ApiProperty({ description: 'Display name', example: 'Jane Doe', nullable: true })
  displayName: string | null;

  @ApiProperty({ description: 'Avatar URL', example: 'https://example.com/avatar.png', nullable: true })
  avatarUrl: string | null;
}

export class DiscoverCandidateDto extends MatchUserDto {
  @ApiProperty({ description: 'Compatibility score from 0 to 100', example: 78 })
  compatibilityScore: number;

  @ApiProperty({ description: 'Skills this candidate can teach the current user', type: [SkillOverlapItemDto] })
  canTeachMe: SkillOverlapItemDto[];

  @ApiProperty({ description: 'Skills the current user can teach this candidate', type: [SkillOverlapItemDto] })
  canLearnFromMe: SkillOverlapItemDto[];
}

export class DiscoverResponseDto {
  @ApiProperty({ description: 'Ranked candidates', type: [DiscoverCandidateDto] })
  candidates: DiscoverCandidateDto[];

  @ApiProperty({ description: 'Eligible candidates remaining after this batch', example: 25 })
  remaining: number;
}

export class LikeResponseDto {
  @ApiProperty({ description: 'Match UUID', example: 'd6cae4c0-6b1c-4e49-a946-129cabf5258d' })
  matchId: string;

  @ApiProperty({ description: 'Current match status', enum: MatchStatus, example: MatchStatus.PENDING })
  status: MatchStatus;

  @ApiProperty({ description: 'Compatibility score snapshot', example: 78 })
  compatibilityScore: number;

  @ApiProperty({ description: 'Whether the like completed a mutual match', example: false })
  isMutualMatch: boolean;

  @ApiProperty({ description: 'Matched user when mutual', type: MatchUserDto, required: false })
  matchedUser?: MatchUserDto;

  @ApiProperty({ description: 'Skills this user can teach the current user', type: [SkillOverlapItemDto], required: false })
  canTeachMe?: SkillOverlapItemDto[];

  @ApiProperty({ description: 'Skills the current user can teach this user', type: [SkillOverlapItemDto], required: false })
  canLearnFromMe?: SkillOverlapItemDto[];

  @ApiProperty({ description: 'Human-readable status message', example: 'Match request sent' })
  message: string;
}

export class InboxRequestDto {
  @ApiProperty({ description: 'Match UUID', example: 'd6cae4c0-6b1c-4e49-a946-129cabf5258d' })
  matchId: string;

  @ApiProperty({ description: 'User who requested the match', type: MatchUserDto })
  requester: MatchUserDto;

  @ApiProperty({ description: 'Compatibility score snapshot', example: 85 })
  compatibilityScore: number;

  @ApiProperty({ description: 'Skills the requester can teach the current user', type: [SkillOverlapItemDto] })
  canTeachMe: SkillOverlapItemDto[];

  @ApiProperty({ description: 'Skills the current user can teach the requester', type: [SkillOverlapItemDto] })
  canLearnFromMe: SkillOverlapItemDto[];

  @ApiProperty({ description: 'Request creation date', example: '2026-04-26T12:00:00Z' })
  createdAt: Date;
}

export class MatchListItemDto {
  @ApiProperty({ description: 'Match UUID', example: 'd6cae4c0-6b1c-4e49-a946-129cabf5258d' })
  matchId: string;

  @ApiProperty({ description: 'Matched user', type: MatchUserDto })
  matchedUser: MatchUserDto;

  @ApiProperty({ description: 'Compatibility score snapshot', example: 78 })
  compatibilityScore: number;

  @ApiProperty({ description: 'Skill overlap snapshot' })
  skillOverlap: {
    canTeachMe: SkillOverlapItemDto[];
    canLearnFromMe: SkillOverlapItemDto[];
  };

  @ApiProperty({ description: 'Accepted match date', example: '2026-04-26T12:00:00Z' })
  matchedAt: Date | null;
}
