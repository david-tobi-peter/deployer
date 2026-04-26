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
