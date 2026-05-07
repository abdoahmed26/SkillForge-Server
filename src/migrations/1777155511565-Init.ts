import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1777155511565 implements MigrationInterface {
    name = 'Init1777155511565'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying(50) NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "displayName" character varying(100), "bio" text, "avatarUrl" character varying(500), "refreshTokenHash" character varying(255), "xp" integer NOT NULL DEFAULT '0', "level" integer NOT NULL DEFAULT '1', "currentStreak" integer NOT NULL DEFAULT '0', "lastLoginAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_user_username" ON "users" ("username") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_user_email" ON "users" ("email") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_user_email"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_username"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
