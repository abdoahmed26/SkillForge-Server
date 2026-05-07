import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateNotificationTable20260503060300 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'recipientId', type: 'uuid' },
          { name: 'type', type: 'varchar', length: '30' },
          { name: 'title', type: 'varchar', length: '200' },
          { name: 'description', type: 'varchar', length: '500' },
          { name: 'isRead', type: 'boolean', default: false },
          { name: 'referenceId', type: 'uuid', isNullable: true },
          { name: 'referenceType', type: 'varchar', length: '30', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndices('notifications', [
      new TableIndex({ name: 'IDX_notification_recipient_created', columnNames: ['recipientId', 'createdAt'] }),
      new TableIndex({ name: 'IDX_notification_recipient_unread', columnNames: ['recipientId', 'isRead'] }),
      new TableIndex({ name: 'IDX_notification_created', columnNames: ['createdAt'] }),
    ]);
    await queryRunner.createForeignKey('notifications', new TableForeignKey({ columnNames: ['recipientId'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'CASCADE' }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notifications', true);
  }
}
