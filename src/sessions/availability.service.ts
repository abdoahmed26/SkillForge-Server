import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Match } from '../matching/entities/match.entity';
import { MatchStatus } from '../matching/enums/match.enums';
import {
  AvailabilitySlotInputDto,
  BulkUpdateAvailabilityDto,
  UpdateAvailabilitySlotDto,
} from './dto/availability-slot.dto';
import { AvailabilitySlot } from './entities/availability-slot.entity';
import { Session } from './entities/session.entity';
import { SessionStatus } from './enums/session.enums';

const SLOT_MINUTES = 30;
const SESSION_MINUTES = 60;
const BOOKING_WINDOW_DAYS = 14;
const MIN_LEAD_MS = 2 * 60 * 60 * 1000;

const addMinutesToTime = (time: string, minutes: number) => {
  const [hours, mins] = time.split(':').map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);
const getDayOfWeek = (date: Date) => (date.getUTCDay() + 6) % 7;
const getLocalDateAtOffset = (date: Date, timezoneOffsetMinutes: number) =>
  new Date(date.getTime() - timezoneOffsetMinutes * 60 * 1000);

const getUtcDateFromLocalParts = (
  year: number,
  month: number,
  day: number,
  time: string,
  timezoneOffsetMinutes: number,
) => {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month, day, hours, minutes, 0, 0) + timezoneOffsetMinutes * 60 * 1000);
};

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(AvailabilitySlot)
    private readonly availabilityRepository: Repository<AvailabilitySlot>,
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
  ) {}

  async getMySlots(userId: string) {
    const slots = await this.availabilityRepository.find({
      where: { userId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
    return { slots };
  }

  async getMySlot(userId: string, slotId: string) {
    const slot = await this.findOwnedSlot(userId, slotId);
    return { slot };
  }

  async addMySlot(userId: string, dto: AvailabilitySlotInputDto) {
    const existing = await this.availabilityRepository.findOne({
      where: { userId, dayOfWeek: dto.dayOfWeek, startTime: dto.startTime },
    });
    if (existing) {
      throw new ConflictException('Availability slot already exists');
    }

    const slot = await this.availabilityRepository.save(
      this.availabilityRepository.create({
        userId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: addMinutesToTime(dto.startTime, SLOT_MINUTES),
      }),
    );
    return { slot };
  }

  async updateMySlot(userId: string, slotId: string, dto: UpdateAvailabilitySlotDto) {
    const slot = await this.findOwnedSlot(userId, slotId);
    const nextDayOfWeek = dto.dayOfWeek ?? slot.dayOfWeek;
    const nextStartTime = dto.startTime ?? slot.startTime;

    if (nextDayOfWeek !== slot.dayOfWeek || nextStartTime !== slot.startTime) {
      const duplicate = await this.availabilityRepository.findOne({
        where: { userId, dayOfWeek: nextDayOfWeek, startTime: nextStartTime },
      });
      if (duplicate && duplicate.id !== slotId) {
        throw new ConflictException('Availability slot already exists');
      }
    }

    slot.dayOfWeek = nextDayOfWeek;
    slot.startTime = nextStartTime;
    slot.endTime = addMinutesToTime(nextStartTime, SLOT_MINUTES);
    return { slot: await this.availabilityRepository.save(slot) };
  }

  async deleteMySlot(userId: string, slotId: string) {
    const slot = await this.findOwnedSlot(userId, slotId);
    await this.availabilityRepository.remove(slot);
    return { message: 'Availability slot deleted', id: slotId };
  }

  async updateMySlots(userId: string, dto: BulkUpdateAvailabilityDto) {
    await this.availabilityRepository.manager.transaction(async (manager) => {
      await manager.delete(AvailabilitySlot, { userId });
      if (dto.slots.length === 0) {
        return;
      }
      await manager.insert(
        AvailabilitySlot,
        dto.slots.map((slot) => ({
          userId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: addMinutesToTime(slot.startTime, SLOT_MINUTES),
        })),
      );
    });
    return { message: 'Availability updated', slotCount: dto.slots.length };
  }

  async getUserSlots(userId: string, requesterId: string) {
    const match = await this.findAcceptedMatch(userId, requesterId);
    if (!match) {
      throw new ForbiddenException('Availability is only visible for accepted matches');
    }
    return this.getMySlots(userId);
  }

  async getAvailableSlots(teacherId: string, learnerId: string, timezoneOffsetMinutes = 0) {
    const match = await this.findAcceptedMatch(teacherId, learnerId);
    if (!match) {
      throw new ForbiddenException('Sessions can only be booked with accepted matches');
    }

    const [teacherSlots, learnerSlots, sessions] = await Promise.all([
      this.availabilityRepository.find({ where: { userId: teacherId } }),
      this.availabilityRepository.find({ where: { userId: learnerId } }),
      this.sessionsRepository.find({
        where: { status: SessionStatus.SCHEDULED },
        order: { scheduledAt: 'ASC' },
      }),
    ]);

    const learnerKeys = new Set(learnerSlots.map((slot) => `${slot.dayOfWeek}:${slot.startTime}`));
    const sharedStarts = teacherSlots
      .filter((slot) => learnerKeys.has(`${slot.dayOfWeek}:${slot.startTime}`))
      .map((slot) => `${slot.dayOfWeek}:${slot.startTime}`);
    const shared = new Set(sharedStarts);
    const now = new Date();
    const localNow = getLocalDateAtOffset(now, timezoneOffsetMinutes);
    const minStart = new Date(now.getTime() + MIN_LEAD_MS);
    const booked = sessions.filter(
      (session) => session.teacherId === teacherId || session.learnerId === learnerId,
    );
    const slots: { date: string; times: string[] }[] = [];

    for (let offset = 0; offset < BOOKING_WINDOW_DAYS; offset += 1) {
      const localDate = new Date(
        Date.UTC(
          localNow.getUTCFullYear(),
          localNow.getUTCMonth(),
          localNow.getUTCDate() + offset,
        ),
      );
      const dayOfWeek = getDayOfWeek(localDate);
      const times: string[] = [];
      for (const key of sharedStarts) {
        const startTime = key.slice(2);
        if (!shared.has(`${dayOfWeek}:${startTime}`) || !shared.has(`${dayOfWeek}:${addMinutesToTime(startTime, SLOT_MINUTES)}`)) {
          continue;
        }
        const start = getUtcDateFromLocalParts(
          localDate.getUTCFullYear(),
          localDate.getUTCMonth(),
          localDate.getUTCDate(),
          startTime,
          timezoneOffsetMinutes,
        );
        if (start < minStart) {
          continue;
        }
        const end = new Date(start.getTime() + SESSION_MINUTES * 60 * 1000);
        const hasConflict = booked.some((session) => {
          const sessionStart = new Date(session.scheduledAt);
          const sessionEnd = new Date(sessionStart.getTime() + session.duration * 60 * 1000);
          return sessionStart < end && sessionEnd > start;
        });
        if (!hasConflict && !times.includes(startTime)) {
          times.push(startTime);
        }
      }
      if (times.length > 0) {
        slots.push({ date: toDateKey(localDate), times: times.sort() });
      }
    }

    return { slots };
  }

  private findAcceptedMatch(firstUserId: string, secondUserId: string) {
    return this.matchesRepository
      .createQueryBuilder('match')
      .where('match.status = :status', { status: MatchStatus.ACCEPTED })
      .andWhere(
        new Brackets((qb) => {
          qb.where('match."userAId" = :firstUserId AND match."userBId" = :secondUserId', {
            firstUserId,
            secondUserId,
          }).orWhere('match."userAId" = :secondUserId AND match."userBId" = :firstUserId', {
            firstUserId,
            secondUserId,
          });
        }),
      )
      .getOne();
  }

  private async findOwnedSlot(userId: string, slotId: string) {
    const slot = await this.availabilityRepository.findOne({ where: { id: slotId, userId } });
    if (!slot) {
      throw new NotFoundException('Availability slot not found');
    }
    return slot;
  }
}
