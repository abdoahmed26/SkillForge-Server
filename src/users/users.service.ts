import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Not, IsNull, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

type CreateUserData = Pick<User, 'username' | 'email' | 'password'> &
  Partial<Pick<User, 'displayName' | 'bio' | 'avatarUrl'>>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string) {
    return this.usersRepository.findOne({ where: { email } });
  }

  findByUsername(username: string) {
    return this.usersRepository.findOne({ where: { username } });
  }

  findById(id: string) {
    return this.usersRepository.findOne({ where: { id } });
  }

  findUsersWithActivePasswordResetToken() {
    return this.usersRepository.find({
      where: {
        passwordResetTokenHash: Not(IsNull()),
        passwordResetExpiresAt: MoreThan(new Date()),
      },
    });
  }

  async create(data: CreateUserData) {
    const user = this.usersRepository.create({
      ...data,
      email: data.email.toLowerCase(),
      displayName: data.displayName ?? data.username,
    });
    return this.usersRepository.save(user);
  }

  async updateProfile(id: string, data: UpdateProfileDto) {
    await this.usersRepository.update(id, data);
    return this.requireById(id);
  }

  async updateAvatar(id: string, avatarUrl: string) {
    await this.usersRepository.update(id, { avatarUrl });
    return this.requireById(id);
  }

  async updatePassword(id: string, password: string) {
    await this.usersRepository.update(id, {
      password,
      refreshTokenHash: null,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });
    return this.requireById(id);
  }

  async updatePasswordResetToken(
    id: string,
    passwordResetTokenHash: string | null,
    passwordResetExpiresAt: Date | null,
  ) {
    await this.usersRepository.update(id, {
      passwordResetTokenHash,
      passwordResetExpiresAt,
    });
    return this.requireById(id);
  }

  async updateRefreshTokenHash(id: string, hash: string) {
    await this.usersRepository.update(id, { refreshTokenHash: hash });
  }

  async removeRefreshTokenHash(id: string) {
    await this.usersRepository.update(id, { refreshTokenHash: null });
  }

  async updateLastLoginAt(id: string, lastLoginAt: Date) {
    await this.usersRepository.update(id, { lastLoginAt });
    return this.requireById(id);
  }

  async requireById(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
