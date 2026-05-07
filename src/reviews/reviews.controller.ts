import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a review for a completed session' })
  @ApiResponse({ status: 201, type: ReviewResponseDto })
  createReview(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(user.id, dto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get reviews received by a user' })
  getReviewsByUser(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.getReviewsByUser(userId, Number(page ?? 1), Number(limit ?? 10));
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get reviews for a session' })
  getReviewsBySession(@Param('sessionId') sessionId: string, @CurrentUser() user: User) {
    return this.reviewsService.getReviewsBySession(sessionId, user.id);
  }
}
