import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AvailabilityService } from './availability.service';
import {
  AvailabilitySlotInputDto,
  BulkUpdateAvailabilityDto,
  UpdateAvailabilitySlotDto,
} from './dto/availability-slot.dto';

@ApiTags('availability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my weekly availability' })
  @ApiResponse({ status: 200, description: 'Availability slots returned' })
  getMySlots(@CurrentUser() user: User) {
    return this.availabilityService.getMySlots(user.id);
  }

  @Post('me')
  @ApiOperation({ summary: 'Add one availability slot' })
  @ApiResponse({ status: 201, description: 'Availability slot created' })
  @ApiResponse({ status: 409, description: 'Availability slot already exists' })
  addMySlot(@CurrentUser() user: User, @Body() dto: AvailabilitySlotInputDto) {
    return this.availabilityService.addMySlot(user.id, dto);
  }

  @Get('me/:slotId')
  @ApiOperation({ summary: 'Get one of my availability slots' })
  @ApiResponse({ status: 200, description: 'Availability slot returned' })
  getMySlot(@CurrentUser() user: User, @Param('slotId', ParseUUIDPipe) slotId: string) {
    return this.availabilityService.getMySlot(user.id, slotId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Replace my weekly availability' })
  @ApiResponse({ status: 200, description: 'Availability updated' })
  updateMySlots(@CurrentUser() user: User, @Body() dto: BulkUpdateAvailabilityDto) {
    return this.availabilityService.updateMySlots(user.id, dto);
  }

  @Patch('me/:slotId')
  @ApiOperation({ summary: 'Update one availability slot' })
  @ApiResponse({ status: 200, description: 'Availability slot updated' })
  @ApiResponse({ status: 404, description: 'Availability slot not found' })
  updateMySlot(
    @CurrentUser() user: User,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() dto: UpdateAvailabilitySlotDto,
  ) {
    return this.availabilityService.updateMySlot(user.id, slotId, dto);
  }

  @Delete('me/:slotId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete one availability slot' })
  @ApiResponse({ status: 200, description: 'Availability slot deleted' })
  @ApiResponse({ status: 404, description: 'Availability slot not found' })
  deleteMySlot(@CurrentUser() user: User, @Param('slotId', ParseUUIDPipe) slotId: string) {
    return this.availabilityService.deleteMySlot(user.id, slotId);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get matched user availability' })
  @ApiResponse({ status: 200, description: 'Availability slots returned' })
  getUserSlots(@CurrentUser() user: User, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.availabilityService.getUserSlots(userId, user.id);
  }
}
