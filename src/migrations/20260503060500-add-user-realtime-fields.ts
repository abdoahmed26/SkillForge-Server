import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddUserRealtimeFields20260503060500 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const addColumn = async (column: TableColumn) => {
      if (!table?.findColumnByName(column.name)) {
        await queryRunner.addColumn('users', column);
      }
    };

    await addColumn(new TableColumn({ name: 'averageRating', type: 'decimal', precision: 3, scale: 2, default: 0 }));
    await addColumn(new TableColumn({ name: 'totalReviewCount', type: 'integer', default: 0 }));
    await addColumn(new TableColumn({ name: 'isOnline', type: 'boolean', default: false }));
    await addColumn(new TableColumn({ name: 'lastSeenAt', type: 'timestamp', isNullable: true }));
    await addColumn(new TableColumn({ name: 'themePreference', type: 'varchar', length: '10', default: "'system'" }));
    await queryRunner.createIndex('users', new TableIndex({ name: 'IDX_user_average_rating', columnNames: ['averageRating'] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'IDX_user_average_rating');
    await queryRunner.dropColumns('users', ['averageRating', 'totalReviewCount', 'isOnline', 'lastSeenAt']);
  }
}
