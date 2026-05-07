import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMatchTables1777155511567 implements MigrationInterface {
  name = 'CreateMatchTables1777155511567';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."matches_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED')`);
    await queryRunner.query(`CREATE TABLE "matches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userAId" uuid NOT NULL, "userBId" uuid NOT NULL, "requesterId" uuid NOT NULL, "status" "public"."matches_status_enum" NOT NULL DEFAULT 'PENDING', "compatibilityScore" integer NOT NULL, "skillOverlapData" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "respondedAt" TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_match_user_pair" UNIQUE ("userAId", "userBId"), CONSTRAINT "PK_matches_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "skipped_matches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "skippedById" uuid NOT NULL, "skippedUserId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_skip_pair" UNIQUE ("skippedById", "skippedUserId"), CONSTRAINT "PK_skipped_matches_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_match_userA" ON "matches" ("userAId")`);
    await queryRunner.query(`CREATE INDEX "IDX_match_userB" ON "matches" ("userBId")`);
    await queryRunner.query(`CREATE INDEX "IDX_match_status" ON "matches" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_match_requester" ON "matches" ("requesterId")`);
    await queryRunner.query(`CREATE INDEX "IDX_skip_by" ON "skipped_matches" ("skippedById")`);
    await queryRunner.query(`CREATE INDEX "IDX_skip_created" ON "skipped_matches" ("createdAt")`);
    await queryRunner.query(`ALTER TABLE "matches" ADD CONSTRAINT "FK_matches_userA" FOREIGN KEY ("userAId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "matches" ADD CONSTRAINT "FK_matches_userB" FOREIGN KEY ("userBId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "matches" ADD CONSTRAINT "FK_matches_requester" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "skipped_matches" ADD CONSTRAINT "FK_skipped_by" FOREIGN KEY ("skippedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "skipped_matches" ADD CONSTRAINT "FK_skipped_user" FOREIGN KEY ("skippedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "skipped_matches" DROP CONSTRAINT "FK_skipped_user"`);
    await queryRunner.query(`ALTER TABLE "skipped_matches" DROP CONSTRAINT "FK_skipped_by"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_requester"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_userB"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_userA"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_skip_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_skip_by"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_match_requester"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_match_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_match_userB"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_match_userA"`);
    await queryRunner.query(`DROP TABLE "skipped_matches"`);
    await queryRunner.query(`DROP TABLE "matches"`);
    await queryRunner.query(`DROP TYPE "public"."matches_status_enum"`);
  }
}
