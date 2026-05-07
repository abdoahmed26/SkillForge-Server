import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ReviewSuggestionDto } from './dto/review-suggestion.dto';
import { SkillQueryDto } from './dto/skill-query.dto';
import { SuggestSkillDto } from './dto/suggest-skill.dto';
import { SkillsService } from './skills.service';

type RequestWithUser = {
  user?: User;
};

@Injectable()
class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return Boolean(request.user && request.user.level >= 10);
  }
}

@ApiTags('skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({ summary: 'Browse the skill marketplace' })
  @ApiResponse({ status: 200, description: 'Paginated skill list' })
  findAll(@Query() query: SkillQueryDto) {
    return this.skillsService.findAll(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all skill categories with counts' })
  @ApiResponse({ status: 200, description: 'Skill categories returned' })
  getCategories() {
    return this.skillsService.getCategories();
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Autocomplete skill names' })
  @ApiQuery({ name: 'q', example: 'Jav', minLength: 2 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Matching skill suggestions' })
  autocomplete(@Query('q') q: string, @Query('limit') limit?: string) {
    if (!q || q.trim().length < 2) {
      throw new BadRequestException('Query must be at least 2 characters');
    }
    return this.skillsService.autocomplete(q, Number(limit) || 10);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a skill with teachers and learners' })
  @ApiResponse({ status: 200, description: 'Skill detail returned' })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.skillsService.findOne(id);
  }

  @Post('suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suggest a new catalog skill' })
  @ApiResponse({ status: 201, description: 'Skill suggestion submitted' })
  createSuggestion(
    @Body() dto: SuggestSkillDto,
    @CurrentUser() user: User,
  ) {
    return this.skillsService.createSuggestion(dto, user.id);
  }

  @Patch('suggestions/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve or reject a skill suggestion' })
  @ApiResponse({ status: 200, description: 'Skill suggestion reviewed' })
  @ApiResponse({ status: 404, description: 'Skill suggestion not found' })
  reviewSuggestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewSuggestionDto,
  ) {
    return this.skillsService.reviewSuggestion(id, dto);
  }
}
