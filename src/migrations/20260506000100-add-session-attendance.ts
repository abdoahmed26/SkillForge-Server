import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionAttendance20260506000100 implements MigrationInterface {
  name = 'AddSessionAttendance20260506000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TYPE "public"."sessions_status_enum" RENAME TO "sessions_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."sessions_status_enum" AS ENUM('PENDING', 'SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED', 'REJECTED')`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "status" TYPE "public"."sessions_status_enum" USING "status"::text::"public"."sessions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."sessions_status_enum_old"`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "teacherJoinedAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "learnerJoinedAt" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "learnerJoinedAt"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "teacherJoinedAt"`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`UPDATE "sessions" SET "status" = 'COMPLETED' WHERE "status" = 'MISSED'`);
    await queryRunner.query(`ALTER TYPE "public"."sessions_status_enum" RENAME TO "sessions_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."sessions_status_enum" AS ENUM('PENDING', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'REJECTED')`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "status" TYPE "public"."sessions_status_enum" USING "status"::text::"public"."sessions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."sessions_status_enum_old"`);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
  }
}
