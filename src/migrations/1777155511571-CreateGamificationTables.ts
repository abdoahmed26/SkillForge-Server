import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGamificationTables1777155511571 implements MigrationInterface {
  name = 'CreateGamificationTables1777155511571';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastActiveDate" date`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "streakUpdatedAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timezone" character varying(50) NOT NULL DEFAULT 'UTC'`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_xp" ON "users" ("xp")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_level" ON "users" ("level")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "achievements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" text NOT NULL, "icon" character varying(255) NOT NULL, "conditionEventType" character varying(50) NOT NULL, "conditionThreshold" integer NOT NULL, "rarityCategory" character varying(20) NOT NULL DEFAULT 'common', "sortOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_achievement_name" UNIQUE ("name"), CONSTRAINT "PK_achievements_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_achievement_event_type" ON "achievements" ("conditionEventType")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "user_achievements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "achievementId" uuid NOT NULL, "unlockedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_user_achievement" UNIQUE ("userId", "achievementId"), CONSTRAINT "PK_user_achievements_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_achievement_user" ON "user_achievements" ("userId")`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "xp_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "eventType" character varying(50) NOT NULL, "xpAmount" integer NOT NULL, "xpTotal" integer NOT NULL, "referenceId" uuid, "referenceType" character varying(30), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_xp_transactions_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_xp_transaction_user" ON "xp_transactions" ("userId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_xp_transaction_user_event_date" ON "xp_transactions" ("userId", "eventType", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_xp_transaction_user_weekly" ON "xp_transactions" ("userId", "createdAt")`);

    await queryRunner.query(`ALTER TABLE "user_achievements" ADD CONSTRAINT "FK_user_achievements_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "user_achievements" ADD CONSTRAINT "FK_user_achievements_achievement" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "xp_transactions" ADD CONSTRAINT "FK_xp_transactions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`
      INSERT INTO "achievements" ("name", "description", "icon", "conditionEventType", "conditionThreshold", "rarityCategory", "sortOrder")
      VALUES
        ('First Steps', 'Complete your first learning or teaching session.', 'first-steps', 'session_complete', 1, 'common', 1),
        ('Polyglot', 'Teach five distinct skills.', 'polyglot', 'unique_skills_taught', 5, 'rare', 2),
        ('Streak Master', 'Maintain a seven-day activity streak.', 'streak-master', 'streak_days', 7, 'rare', 3),
        ('Community Pillar', 'Complete fifty learning or teaching sessions.', 'community-pillar', 'session_complete', 50, 'epic', 4),
        ('Five Star', 'Earn XP from ten five-star reviews.', 'five-star', 'review_5star', 10, 'legendary', 5)
      ON CONFLICT ("name") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "xp_transactions" DROP CONSTRAINT IF EXISTS "FK_xp_transactions_user"`);
    await queryRunner.query(`ALTER TABLE "user_achievements" DROP CONSTRAINT IF EXISTS "FK_user_achievements_achievement"`);
    await queryRunner.query(`ALTER TABLE "user_achievements" DROP CONSTRAINT IF EXISTS "FK_user_achievements_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_xp_transaction_user_weekly"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_xp_transaction_user_event_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_xp_transaction_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "xp_transactions"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_user_achievement_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_achievements"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_achievement_event_type"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "achievements"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_user_level"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_user_xp"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "timezone"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "streakUpdatedAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "lastActiveDate"`);
  }
}
