import type { MigrationInterface, QueryRunner } from "typeorm";

export class DropLogsTable1777300418759 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("logs");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "logs" (
        "id" varchar PRIMARY KEY NOT NULL,
        "file_path" varchar NOT NULL,
        "level" varchar NOT NULL DEFAULT ('info'),
        "timestamp" datetime NOT NULL DEFAULT (datetime('now')),
        "deployment_id" varchar
      )
    `);
  }

}
