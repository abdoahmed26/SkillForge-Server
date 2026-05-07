import { MigrationInterface, QueryRunner } from 'typeorm';

export class SessionRequestWorkflow1777155511569 implements MigrationInterface {
  name = 'SessionRequestWorkflow1777155511569';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TYPE "public"."sessions_status_enum" RENAME TO "sessions_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."sessions_status_enum" AS ENUM('PENDING', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'REJECTED')`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "status" TYPE "public"."sessions_status_enum" USING "status"::text::"public"."sessions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."sessions_status_enum_old"`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "requestedBy" uuid`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "rejectionComment" text`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "respondedAt" TIMESTAMP`);
    await queryRunner.query(`UPDATE "sessions" SET "requestedBy" = "learnerId" WHERE "requestedBy" IS NULL`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_requested_by" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "FK_sessions_requested_by"`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`UPDATE "sessions" SET "status" = 'CANCELLED' WHERE "status" IN ('PENDING', 'REJECTED')`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "respondedAt"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "rejectionComment"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "requestedBy"`);
    await queryRunner.query(`ALTER TYPE "public"."sessions_status_enum" RENAME TO "sessions_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."sessions_status_enum" AS ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED')`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "status" TYPE "public"."sessions_status_enum" USING "status"::text::"public"."sessions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."sessions_status_enum_old"`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED'`);
  }
}
