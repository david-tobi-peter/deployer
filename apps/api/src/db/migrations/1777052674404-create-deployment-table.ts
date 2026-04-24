import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDeploymentTable1777052674404 implements MigrationInterface {
  private tableName: string = "deployments";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ${this.tableName} (
        "id" uuid PRIMARY KEY,
        "git_url" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'BUILDING', 'DEPLOYING', 'RUNNING', 'FAILED')),
        "image_tag" varchar,
        "container_id" varchar,
        "live_url" varchar,
        "created_at" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" datetime
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE ${this.tableName}`);
  }
}
