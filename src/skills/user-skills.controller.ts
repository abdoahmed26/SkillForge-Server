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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateUserSkillDto } from './dto/create-user-skill.dto';
import { UpdateUserSkillDto } from './dto/update-user-skill.dto';
import { SkillsService } from './skills.service';

@ApiTags('user-skills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me/skills')
export class UserSkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user skills' })
  @ApiResponse({ status: 200, description: 'User skills returned' })
  getMySkills(@CurrentUser() user: User) {
    return this.skillsService.getUserSkills(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a skill to the current user profile' })
  @ApiResponse({ status: 201, description: 'User skill created' })
  @ApiResponse({ status: 409, description: 'Duplicate user skill' })
  addUserSkill(
    @CurrentUser() user: User,
    @Body() dto: CreateUserSkillDto,
  ) {
    return this.skillsService.addUserSkill(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a current user skill' })
  @ApiResponse({ status: 200, description: 'User skill updated' })
  @ApiResponse({ status: 404, description: 'User skill not found' })
  updateUserSkill(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserSkillDto,
  ) {
    return this.skillsService.updateUserSkill(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a skill from the current user profile' })
  @ApiResponse({ status: 204, description: 'User skill removed' })
  @ApiResponse({ status: 404, description: 'User skill not found' })
  async removeUserSkill(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.skillsService.removeUserSkill(user.id, id);
  }
}
