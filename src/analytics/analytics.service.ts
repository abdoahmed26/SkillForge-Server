import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../sessions/entities/session.entity';
import { SessionStatus } from '../sessions/enums/session.enums';

type CountRow = {
  count: string;
};

type HoursRow = {
  month: string;
  teachingHours: string | null;
  learningHours: string | null;
};

type CategoryRow = {
  category: string;
  teachCount: string;
  learnCount: string;
};

type HeatmapRow = {
  date: string;
  activityCount: string;
};

type TopSkillRow = {
  skillName: string;
  sessionCount: string;
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
  ) {}

  async getDashboard(userId: string) {
    const [
      stats,
      teachingHoursMonthly,
      skillsRadar,
      activityHeatmap,
      topSkillsTaught,
      topSkillsLearned,
    ] = await Promise.all([
      this.getStats(userId),
      this.getMonthlyHours(userId),
      this.getSkillsRadar(userId),
      this.getActivityHeatmap(userId),
      this.getTopSkills(userId, 'teacherId'),
      this.getTopSkills(userId, 'learnerId'),
    ]);

    return {
      stats,
      teachingHoursMonthly,
      skillsRadar,
      activityHeatmap,
      topSkillsTaught,
      topSkillsLearned,
    };
  }

  private async getStats(userId: string) {
    const scoped = this.sessionsRepository
      .createQueryBuilder('session')
      .where('(session.teacherId = :userId OR session.learnerId = :userId)', { userId });

    const [totalSessions, completedSessions, teachingHours, learningHours] = await Promise.all([
      scoped.clone().getCount(),
      scoped.clone().andWhere('session.status = :status', { status: SessionStatus.COMPLETED }).getCount(),
      this.sumHours(userId, 'teacherId'),
      this.sumHours(userId, 'learnerId'),
    ]);

    return {
      totalSessions,
      totalTeachingHours: teachingHours,
      totalLearningHours: learningHours,
      completionRate: totalSessions ? Number((completedSessions / totalSessions).toFixed(2)) : 0,
    };
  }

  private async sumHours(userId: string, roleColumn: 'teacherId' | 'learnerId') {
    const result = await this.sessionsRepository
      .createQueryBuilder('session')
      .select('COALESCE(SUM(session.duration), 0)', 'minutes')
      .where(`session.${roleColumn} = :userId`, { userId })
      .andWhere('session.status = :status', { status: SessionStatus.COMPLETED })
      .getRawOne<{ minutes: string }>();

    return Number((Number(result?.minutes ?? 0) / 60).toFixed(1));
  }

  private async getMonthlyHours(userId: string) {
    const rows = await this.sessionsRepository.query<HoursRow[]>(
      `
      SELECT
        to_char(date_trunc('month', "scheduledAt"), 'YYYY-MM') AS month,
        SUM(CASE WHEN "teacherId" = $1 THEN "duration" ELSE 0 END) / 60.0 AS "teachingHours",
        SUM(CASE WHEN "learnerId" = $1 THEN "duration" ELSE 0 END) / 60.0 AS "learningHours"
      FROM sessions
      WHERE ("teacherId" = $1 OR "learnerId" = $1)
        AND status = $2
        AND "scheduledAt" >= NOW() - INTERVAL '12 months'
      GROUP BY date_trunc('month', "scheduledAt")
      ORDER BY month ASC
      `,
      [userId, SessionStatus.COMPLETED],
    );

    return rows.map((row) => ({
      month: row.month,
      teachingHours: Number(Number(row.teachingHours ?? 0).toFixed(1)),
      learningHours: Number(Number(row.learningHours ?? 0).toFixed(1)),
    }));
  }

  private async getSkillsRadar(userId: string) {
    const rows = await this.sessionsRepository.query<CategoryRow[]>(
      `
      SELECT
        skills.category AS category,
        COUNT(*) FILTER (WHERE sessions."teacherId" = $1)::int AS "teachCount",
        COUNT(*) FILTER (WHERE sessions."learnerId" = $1)::int AS "learnCount"
      FROM sessions
      INNER JOIN skills ON skills.id = sessions."skillId"
      WHERE (sessions."teacherId" = $1 OR sessions."learnerId" = $1)
        AND sessions.status = $2
      GROUP BY skills.category
      ORDER BY skills.category ASC
      `,
      [userId, SessionStatus.COMPLETED],
    );

    return rows.map((row) => ({
      category: row.category,
      teachCount: Number(row.teachCount),
      learnCount: Number(row.learnCount),
    }));
  }

  private async getActivityHeatmap(userId: string) {
    const rows = await this.sessionsRepository.query<HeatmapRow[]>(
      `
      SELECT
        to_char("scheduledAt"::date, 'YYYY-MM-DD') AS date,
        COUNT(*)::int AS "activityCount"
      FROM sessions
      WHERE ("teacherId" = $1 OR "learnerId" = $1)
        AND status = $2
        AND "scheduledAt" >= NOW() - INTERVAL '12 months'
      GROUP BY "scheduledAt"::date
      ORDER BY date ASC
      `,
      [userId, SessionStatus.COMPLETED],
    );

    return rows.map((row) => ({
      date: row.date,
      activityCount: Number(row.activityCount),
    }));
  }

  private async getTopSkills(userId: string, roleColumn: 'teacherId' | 'learnerId') {
    const rows = await this.sessionsRepository.query<TopSkillRow[]>(
      `
      SELECT
        skills.name AS "skillName",
        COUNT(*)::int AS "sessionCount"
      FROM sessions
      INNER JOIN skills ON skills.id = sessions."skillId"
      WHERE sessions."${roleColumn}" = $1
        AND sessions.status = $2
      GROUP BY skills.name
      ORDER BY COUNT(*) DESC, skills.name ASC
      LIMIT 5
      `,
      [userId, SessionStatus.COMPLETED],
    );

    return rows.map((row) => ({
      skillName: row.skillName,
      sessionCount: Number(row.sessionCount),
    }));
  }
}
