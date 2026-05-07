import { MigrationInterface, QueryRunner, Table, TableCheck, TableForeignKey, TableIndex, TableUnique } from 'typeorm';

export class CreateReviewTable20260503060400 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'reviews',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'reviewerId', type: 'uuid' },
          { name: 'reviewedUserId', type: 'uuid' },
          { name: 'sessionId', type: 'uuid' },
          { name: 'reviewerRole', type: 'varchar', length: '10' },
          { name: 'rating', type: 'smallint' },
          { name: 'text', type: 'varchar', length: '1000', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createCheckConstraint('reviews', new TableCheck({ name: 'CHK_review_rating_range', expression: '"rating" >= 1 AND "rating" <= 5' }));
    await queryRunner.createUniqueConstraint('reviews', new TableUnique({ name: 'UQ_review_reviewer_session', columnNames: ['reviewerId', 'sessionId'] }));
    await queryRunner.createIndices('reviews', [
      new TableIndex({ name: 'IDX_review_reviewed_user', columnNames: ['reviewedUserId', 'createdAt'] }),
      new TableIndex({ name: 'IDX_review_reviewer_created', columnNames: ['reviewerId', 'createdAt'] }),
    ]);
    await queryRunner.createForeignKeys('reviews', [
      new TableForeignKey({ columnNames: ['reviewerId'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
      new TableForeignKey({ columnNames: ['reviewedUserId'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
      new TableForeignKey({ columnNames: ['sessionId'], referencedTableName: 'sessions', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('reviews', true);
  }
}
