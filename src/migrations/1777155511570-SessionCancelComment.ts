import { MigrationInterface, QueryRunner } from 'typeorm';

export class SessionCancelComment1777155511570 implements MigrationInterface {
  name = 'SessionCancelComment1777155511570';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "cancellationComment" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "cancellationComment"`);
  }
}
