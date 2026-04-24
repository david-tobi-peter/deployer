import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLogTable1777052739570 implements MigrationInterface {
  private tableName: string = "logs";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ${this.tableName} (
        "id" uuid PRIMARY KEY,
        "file_path" varchar NOT NULL,
        "level" varchar NOT NULL DEFAULT 'INFO' CHECK(level IN ('FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE')),
        "timestamp" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deployment_id" uuid NOT NULL,
        FOREIGN KEY ("deployment_id") REFERENCES "deployments" ("id") ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE ${this.tableName}`);
  }
}
