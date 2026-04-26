import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCommitHashToDeploymentTable1777209269322 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE deployments ADD COLUMN commit_hash VARCHAR NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE deployments DROP COLUMN commit_hash`);
  }

}
