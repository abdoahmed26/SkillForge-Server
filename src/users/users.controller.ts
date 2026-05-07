import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { multerOptions } from '../config/uploadfile';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  profile(@CurrentUser() user: User) {
    return this.toPublicUser(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a public user profile' })
  @ApiResponse({ status: 200, description: 'Public user profile' })
  async getPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.requireById(id);
    return this.toPublicUser(user);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update profile details' })
  @ApiResponse({ status: 200, description: 'Updated user profile' })
  async updateProfile(@CurrentUser() user: User, @Body() updateDto: UpdateProfileDto) {
    const updatedUser = await this.usersService.updateProfile(user.id, updateDto);
    return this.toPublicUser(updatedUser);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar', multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload avatar image' })
  @ApiResponse({ status: 201, description: 'Avatar uploaded' })
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const avatarUrl = file.path;
    await this.usersService.updateAvatar(user.id, avatarUrl);
    return { avatarUrl };
  }

  private toPublicUser(user: User) {
    const { password, refreshTokenHash, updatedAt, ...publicUser } = user;
    void password;
    void refreshTokenHash;
    void updatedAt;
    return publicUser;
  }
}
