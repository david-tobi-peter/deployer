import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from "typeorm";
import { Deployment } from "@entities/deployment.entity.js";
import { LogLevelEnum } from "@shared/index.js";

@Entity({ name: "logs" })
export class Log {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "file_path", type: "varchar" })
  filePath!: string;

  @Column({
    name: "level",
    type: "varchar",
    enum: LogLevelEnum,
    default: LogLevelEnum.INFO,
  })
  level!: LogLevelEnum;

  @CreateDateColumn({ name: "timestamp" })
  timestamp!: Date;

  @OneToOne(() => Deployment, (deployment) => deployment.log, { onDelete: "CASCADE" })
  @JoinColumn({ name: "deployment_id" })
  deployment!: Deployment;
}
