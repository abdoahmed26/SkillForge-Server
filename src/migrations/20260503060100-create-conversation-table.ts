import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from 'typeorm';

export class CreateConversationTable20260503060100 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'conversations',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'matchId', type: 'uuid' },
          { name: 'participantOneId', type: 'uuid' },
          { name: 'participantTwoId', type: 'uuid' },
          { name: 'lastMessageAt', type: 'timestamp', isNullable: true },
          { name: 'lastMessagePreview', type: 'varchar', length: '100', isNullable: true },
          { name: 'unreadCountOne', type: 'integer', default: 0 },
          { name: 'unreadCountTwo', type: 'integer', default: 0 },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createUniqueConstraint('conversations', new TableUnique({ name: 'UQ_conversation_match', columnNames: ['matchId'] }));
    await queryRunner.createIndices('conversations', [
      new TableIndex({ name: 'IDX_conversation_participant_one', columnNames: ['participantOneId', 'lastMessageAt'] }),
      new TableIndex({ name: 'IDX_conversation_participant_two', columnNames: ['participantTwoId', 'lastMessageAt'] }),
    ]);
    await queryRunner.createForeignKeys('conversations', [
      new TableForeignKey({ columnNames: ['matchId'], referencedTableName: 'matches', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
      new TableForeignKey({ columnNames: ['participantOneId'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
      new TableForeignKey({ columnNames: ['participantTwoId'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('conversations', true);
  }
}
