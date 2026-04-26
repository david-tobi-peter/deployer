import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne } from "typeorm";
import { Log } from "@entities/log.entity.js";
import { DeploymentStatusEnum } from "@shared/index.js";

@Entity({ name: "deployments" })
export class Deployment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "git_url", type: "varchar" })
  gitUrl!: string;

  @Column({
    name: "status",
    type: "varchar",
    enum: DeploymentStatusEnum,
    default: DeploymentStatusEnum.PENDING,
  })
  status!: DeploymentStatusEnum;

  @Column({ name: "image_tag", type: "varchar", nullable: true })
  imageTag!: string | null;

  @Column({ name: "commit_hash", type: "varchar" })
  commitHash!: string;

  @Column({ name: "container_id", type: "varchar", nullable: true })
  containerId!: string | null;

  @Column({ name: "live_url", type: "varchar", nullable: true })
  liveUrl!: string | null;

  @Column({ name: "port", type: "integer", nullable: true })
  port!: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", nullable: true })
  updatedAt!: Date | null;

  @OneToOne(() => Log, (log) => log.deployment)
  log!: Log;
}
