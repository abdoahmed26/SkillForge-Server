import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateMessageTable20260503060200 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'messages',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'conversationId', type: 'uuid' },
          { name: 'senderId', type: 'uuid' },
          { name: 'content', type: 'varchar', length: '2000' },
          { name: 'isEdited', type: 'boolean', default: false },
          { name: 'isDeleted', type: 'boolean', default: false },
          { name: 'reactions', type: 'jsonb', default: "'[]'::jsonb" },
          { name: 'readAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndices('messages', [
      new TableIndex({ name: 'IDX_message_conversation_created', columnNames: ['conversationId', 'createdAt'] }),
      new TableIndex({ name: 'IDX_message_sender', columnNames: ['senderId'] }),
    ]);
    await queryRunner.createForeignKeys('messages', [
      new TableForeignKey({ columnNames: ['conversationId'], referencedTableName: 'conversations', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
      new TableForeignKey({ columnNames: ['senderId'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'CASCADE' }),
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('messages', true);
  }
}
