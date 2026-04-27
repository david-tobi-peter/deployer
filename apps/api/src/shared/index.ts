import path from "path";
import config from "@/config/index.js";

export enum DeploymentStatusEnum {
  PENDING = "PENDING",
  BUILDING = "BUILDING",
  DEPLOYING = "DEPLOYING",
  RUNNING = "RUNNING",
  FAILED = "FAILED",
}

export enum LogLevelEnum {
  FATAL = "fatal",
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
  TRACE = "trace",
}

export interface IDeploymentResponse {
  id: string;
  gitUrl: string;
  status: DeploymentStatusEnum;
  containerId: string | null;
  imageTag: string | null;
  commitHash: string;
  port: number | null;
  liveUrl: string | null;
}

export const GET_LOG_FILE_DIR = (deploymentId: string) =>
  path.join(config.app.STORAGE_DIR, "logs", `${deploymentId}.log`);

export const GET_BUILD_DIR = (deploymentId: string) =>
  path.join(config.app.STORAGE_DIR, "builds", deploymentId);

export const GET_GLOBAL_LOG_DIR = () =>
  path.resolve(process.cwd(), "logs");
