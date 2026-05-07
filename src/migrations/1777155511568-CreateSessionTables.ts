import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessionTables1777155511568 implements MigrationInterface {
  name = 'CreateSessionTables1777155511568';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."sessions_status_enum" AS ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED')`);
    await queryRunner.query(`CREATE TABLE "availability_slots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "dayOfWeek" smallint NOT NULL, "startTime" character varying(5) NOT NULL, "endTime" character varying(5) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_availability_day_of_week" CHECK ("dayOfWeek" >= 0 AND "dayOfWeek" <= 6), CONSTRAINT "UQ_availability_user_day_start" UNIQUE ("userId", "dayOfWeek", "startTime"), CONSTRAINT "PK_availability_slots_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "teacherId" uuid NOT NULL, "learnerId" uuid NOT NULL, "skillId" uuid NOT NULL, "matchId" uuid NOT NULL, "scheduledAt" TIMESTAMP NOT NULL, "duration" integer NOT NULL DEFAULT '60', "status" "public"."sessions_status_enum" NOT NULL DEFAULT 'SCHEDULED', "notes" text, "rescheduleCount" smallint NOT NULL DEFAULT '0', "cancelledBy" uuid, "cancelledAt" TIMESTAMP, "completedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_sessions_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_availability_user" ON "availability_slots" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_session_teacher" ON "sessions" ("teacherId")`);
    await queryRunner.query(`CREATE INDEX "IDX_session_learner" ON "sessions" ("learnerId")`);
    await queryRunner.query(`CREATE INDEX "IDX_session_scheduled" ON "sessions" ("scheduledAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_session_status" ON "sessions" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_session_match" ON "sessions" ("matchId")`);
    await queryRunner.query(`ALTER TABLE "availability_slots" ADD CONSTRAINT "FK_availability_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_teacher" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_learner" FOREIGN KEY ("learnerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_cancelled_by" FOREIGN KEY ("cancelledBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_skill" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_match" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_sessions_match"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_sessions_skill"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_sessions_cancelled_by"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_sessions_learner"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_sessions_teacher"`);
    await queryRunner.query(`ALTER TABLE "availability_slots" DROP CONSTRAINT "FK_availability_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_session_match"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_session_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_session_scheduled"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_session_learner"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_session_teacher"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_availability_user"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "availability_slots"`);
    await queryRunner.query(`DROP TYPE "public"."sessions_status_enum"`);
  }
}
