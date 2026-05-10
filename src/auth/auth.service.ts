import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { MailService } from './mail.service';
import { User } from '../users/entities/user.entity';

type JwtPayload = {
  sub: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.toLowerCase();
    const existingEmail = await this.usersService.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    const existingUsername = await this.usersService.findByUsername(registerDto.username);
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const password = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      username: registerDto.username,
      email,
      password,
    });
    const tokens = await this.issueTokens(user.id);
    await this.usersService.updateRefreshTokenHash(
      user.id,
      await bcrypt.hash(tokens.refreshToken, 10),
    );

    return {
      user: this.toPublicUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const matches = await bcrypt.compare(loginDto.password, user.password);
    if (!matches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const updatedUser = await this.usersService.updateLastLoginAt(user.id, new Date());
    this.eventEmitter.emit('user.daily_activity', { userId: user.id });
    const tokens = await this.issueTokens(user.id);
    await this.usersService.updateRefreshTokenHash(
      user.id,
      await bcrypt.hash(tokens.refreshToken, 10),
    );

    return {
      user: this.toPublicUser(updatedUser),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) {
      await this.usersService.removeRefreshTokenHash(user.id);
      throw new ForbiddenException('Token reuse detected. All sessions revoked.');
    }

    const tokens = await this.issueTokens(user.id);
    await this.usersService.updateRefreshTokenHash(
      user.id,
      await bcrypt.hash(tokens.refreshToken, 10),
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.usersService.requireById(userId);
    const matches = await bcrypt.compare(dto.currentPassword, user.password);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const password = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePassword(userId, password);
    return { message: 'Password updated successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    const message = 'If that email exists, a password reset link has been created.';
    if (!user) {
      return { message };
    }

    const resetToken = randomBytes(32).toString('hex');
    const passwordResetTokenHash = await bcrypt.hash(resetToken, 10);
    const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.usersService.updatePasswordResetToken(
      user.id,
      passwordResetTokenHash,
      passwordResetExpiresAt,
    );

    await this.mailService.sendPasswordResetEmail(user.email, this.getResetPasswordUrl(resetToken));

    return { message };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const users = await this.usersService.findUsersWithActivePasswordResetToken();
    const user = await this.findResetUser(users, dto.token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const password = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePassword(user.id, password);
    return { message: 'Password reset successfully' };
  }

  toPublicUser(user: User) {
    const { password, refreshTokenHash, updatedAt, ...publicUser } = user;
    void password;
    void refreshTokenHash;
    void updatedAt;
    return publicUser;
  }

  private async issueTokens(userId: string) {
    const payload: JwtPayload = { sub: userId };
    const refreshExpiresIn = (this.configService.get<string>('JWT_REFRESH_EXPIRY') ??
      '7d') as JwtSignOptions['expiresIn'];
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private get refreshSecret() {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      this.configService.get<string>('JWT_SECRET') ??
      'development-refresh-secret'
    );
  }

  private async findResetUser(users: User[], token: string) {
    for (const user of users) {
      if (!user.passwordResetTokenHash) {
        continue;
      }
      if (await bcrypt.compare(token, user.passwordResetTokenHash)) {
        return user;
      }
    }

    return null;
  }

  private getResetPasswordUrl(resetToken: string) {
    const frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'
    ).replace(/\/$/, '');

    return `${frontendUrl}/#/reset-password?token=${encodeURIComponent(resetToken)}`;
  }
}
