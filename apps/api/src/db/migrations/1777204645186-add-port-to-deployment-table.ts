import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPortToDeploymentTable1777204645186 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "deployments" ADD COLUMN "port" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "deployments" DROP COLUMN "port"`);
    }

}
