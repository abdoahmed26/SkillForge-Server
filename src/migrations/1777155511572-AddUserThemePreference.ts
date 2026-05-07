import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserThemePreference1777155511572 implements MigrationInterface {
  name = 'AddUserThemePreference1777155511572';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "themePreference" character varying(10) NOT NULL DEFAULT 'system'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "themePreference"`);
  }
}
