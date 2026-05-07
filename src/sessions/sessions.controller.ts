import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AvailabilityService } from './availability.service';
import { CancelSessionDto } from './dto/cancel-session.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { RejectSessionDto } from './dto/reject-session.dto';
import { RescheduleSessionDto } from './dto/reschedule-session.dto';
import { SessionQueryDto } from './dto/session-query.dto';
import { SessionsService } from './sessions.service';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Send a session booking request' })
  @ApiResponse({ status: 201, description: 'Session request sent' })
  @ApiResponse({ status: 409, description: 'User has booking in this time' })
  create(@CurrentUser() user: User, @Body() dto: CreateSessionDto) {
    return this.sessionsService.create(user.id, dto);
  }

  @Get('available-slots')
  @ApiOperation({ summary: 'Get bookable slots for a matched teacher' })
  @ApiQuery({ name: 'teacherId', format: 'uuid' })
  @ApiQuery({ name: 'skillId', format: 'uuid' })
  @ApiQuery({ name: 'timezoneOffsetMinutes', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Available slots returned' })
  getAvailableSlots(
    @CurrentUser() user: User,
    @Query('teacherId', ParseUUIDPipe) teacherId: string,
    @Query('skillId', ParseUUIDPipe) _skillId: string,
    @Query('timezoneOffsetMinutes') timezoneOffsetMinutes?: string,
  ) {
    return this.availabilityService.getAvailableSlots(
      teacherId,
      user.id,
      Number(timezoneOffsetMinutes ?? 0),
    );
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming sessions' })
  getUpcoming(@CurrentUser() user: User) {
    return this.sessionsService.getUpcoming(user.id);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get pending sent and received session requests' })
  getRequests(@CurrentUser() user: User) {
    return this.sessionsService.getRequests(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get session history' })
  getHistory(@CurrentUser() user: User, @Query() query: SessionQueryDto) {
    return this.sessionsService.getHistory(user.id, query.status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session details' })
  getById(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessionsService.getById(id, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a scheduled session' })
  cancel(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSessionDto,
  ) {
    return this.sessionsService.cancel(id, user.id, dto);
  }

  @Post(':id/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept a pending session request' })
  @ApiResponse({ status: 200, description: 'Session request accepted' })
  @ApiResponse({ status: 409, description: 'User has booking in this time' })
  accept(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessionsService.accept(id, user.id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject a pending session request with a comment' })
  @ApiResponse({ status: 200, description: 'Session request rejected' })
  reject(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectSessionDto,
  ) {
    return this.sessionsService.reject(id, user.id, dto);
  }

  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule a scheduled session' })
  reschedule(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleSessionDto,
  ) {
    return this.sessionsService.reschedule(id, user.id, dto);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark a scheduled session as completed' })
  complete(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessionsService.complete(id, user.id);
  }

  @Post(':id/join')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark current user as joined and return meeting details' })
  join(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessionsService.join(id, user.id);
  }
}
