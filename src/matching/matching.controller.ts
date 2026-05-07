import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { DiscoverQueryDto } from './dto/discover-query.dto';
import { DiscoverResponseDto, LikeResponseDto, MatchListItemDto } from './dto/match-response.dto';
import { MatchingService } from './matching.service';

@ApiTags('matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('discover')
  @ApiOperation({ summary: 'Get ranked potential matches for the current user' })
  @ApiResponse({ status: 200, description: 'Ranked candidates returned', type: DiscoverResponseDto })
  discover(@CurrentUser() user: User, @Query() query: DiscoverQueryDto) {
    return this.matchingService.discover(user.id, query.limit ?? 10);
  }

  @Post('like/:userId')
  @ApiOperation({ summary: 'Express interest in another user' })
  @ApiResponse({ status: 201, description: 'Match request created or accepted', type: LikeResponseDto })
  @ApiResponse({ status: 409, description: 'Already interacted with this user' })
  like(@CurrentUser() user: User, @Param('userId', ParseUUIDPipe) targetUserId: string) {
    return this.matchingService.like(user.id, targetUserId);
  }

  @Post('skip/:userId')
  @ApiOperation({ summary: 'Skip a user in the discover feed' })
  @ApiResponse({ status: 201, description: 'User skipped' })
  skip(@CurrentUser() user: User, @Param('userId', ParseUUIDPipe) targetUserId: string) {
    return this.matchingService.skip(user.id, targetUserId);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Get pending incoming match requests' })
  @ApiResponse({ status: 200, description: 'Pending match requests returned' })
  getInbox(@CurrentUser() user: User) {
    return this.matchingService.getInbox(user.id);
  }

  @Post('inbox/:matchId/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept a pending match request' })
  @ApiResponse({ status: 200, description: 'Match accepted', type: LikeResponseDto })
  accept(@CurrentUser() user: User, @Param('matchId', ParseUUIDPipe) matchId: string) {
    return this.matchingService.acceptMatch(user.id, matchId);
  }

  @Post('inbox/:matchId/decline')
  @HttpCode(200)
  @ApiOperation({ summary: 'Decline a pending match request' })
  @ApiResponse({ status: 200, description: 'Match declined' })
  decline(@CurrentUser() user: User, @Param('matchId', ParseUUIDPipe) matchId: string) {
    return this.matchingService.declineMatch(user.id, matchId);
  }

  @Get('matches')
  @ApiOperation({ summary: 'Get all accepted matches for the current user' })
  @ApiResponse({ status: 200, description: 'Accepted matches returned', type: [MatchListItemDto] })
  getMatches(@CurrentUser() user: User) {
    return this.matchingService.getMatches(user.id);
  }
}
