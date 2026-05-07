import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSkillTables1777155511566 implements MigrationInterface {
  name = 'CreateSkillTables1777155511566';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."user_skills_type_enum" AS ENUM('TEACH', 'LEARN')`);
    await queryRunner.query(`CREATE TYPE "public"."user_skills_proficiency_enum" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')`);
    await queryRunner.query(`CREATE TYPE "public"."skill_suggestions_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`);
    await queryRunner.query(`CREATE TABLE "skills" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "category" character varying(50) NOT NULL, "description" text, "iconUrl" character varying(500), "searchVector" tsvector, "teacherCount" integer NOT NULL DEFAULT '0', "learnerCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_skills_name" UNIQUE ("name"), CONSTRAINT "PK_skills_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "user_skills" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "skillId" uuid NOT NULL, "type" "public"."user_skills_type_enum" NOT NULL, "proficiency" "public"."user_skills_proficiency_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_user_skill_type" UNIQUE ("userId", "skillId", "type"), CONSTRAINT "PK_user_skills_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "skill_suggestions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "category" character varying(50) NOT NULL, "suggestedById" uuid NOT NULL, "status" "public"."skill_suggestions_status_enum" NOT NULL DEFAULT 'PENDING', "reviewedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_skill_suggestions_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_skill_name" ON "skills" ("name")`);
    await queryRunner.query(`CREATE INDEX "IDX_skill_category" ON "skills" ("category")`);
    await queryRunner.query(`CREATE INDEX "IDX_skill_search_vector" ON "skills" USING GIN ("searchVector")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_skill_user" ON "user_skills" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_skill_skill" ON "user_skills" ("skillId")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_skill_type" ON "user_skills" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_suggestion_status" ON "skill_suggestions" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_suggestion_user" ON "skill_suggestions" ("suggestedById")`);
    await queryRunner.query(`ALTER TABLE "user_skills" ADD CONSTRAINT "FK_user_skills_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "user_skills" ADD CONSTRAINT "FK_user_skills_skill" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "skill_suggestions" ADD CONSTRAINT "FK_skill_suggestions_user" FOREIGN KEY ("suggestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_skill_search_vector()
      RETURNS trigger AS $$
      BEGIN
        NEW."searchVector" := to_tsvector('english', NEW."name");
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "TRG_update_skill_search_vector"
      BEFORE INSERT OR UPDATE OF "name" ON "skills"
      FOR EACH ROW
      EXECUTE FUNCTION update_skill_search_vector()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER "TRG_update_skill_search_vector" ON "skills"`);
    await queryRunner.query(`DROP FUNCTION update_skill_search_vector`);
    await queryRunner.query(`ALTER TABLE "skill_suggestions" DROP CONSTRAINT "FK_skill_suggestions_user"`);
    await queryRunner.query(`ALTER TABLE "user_skills" DROP CONSTRAINT "FK_user_skills_skill"`);
    await queryRunner.query(`ALTER TABLE "user_skills" DROP CONSTRAINT "FK_user_skills_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_suggestion_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_suggestion_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_skill_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_skill_skill"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_skill_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_skill_search_vector"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_skill_category"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_skill_name"`);
    await queryRunner.query(`DROP TABLE "skill_suggestions"`);
    await queryRunner.query(`DROP TABLE "user_skills"`);
    await queryRunner.query(`DROP TABLE "skills"`);
    await queryRunner.query(`DROP TYPE "public"."skill_suggestions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."user_skills_proficiency_enum"`);
    await queryRunner.query(`DROP TYPE "public"."user_skills_type_enum"`);
  }
}
