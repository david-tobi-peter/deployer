import { Server } from "http";
import { app } from "./app.js";
import { AppDataSource } from "@/db/data-source.js";
import { Logger } from "@loggers/index.js";
import { ErrorHandler } from "@errors/index.js";
import { globalDeploymentEmitter } from "@/services/deployment.service.js";
import { deploymentLogEmitter } from "@/services/pipeline.service.js";
import config from "@/config/index.js";

const server = new Server(app);

async function start(): Promise<void> {
  await AppDataSource.initialize();
  Logger.info("Database initialized");

  const port = config.app.PORT;
  await new Promise<void>((resolve) => server.listen(port, resolve));
  Logger.info(`Deployer Control Plane running on port ${port}`);
}

async function shutdown(signal: string): Promise<void> {
  Logger.info(`Received ${signal}. Shutting down gracefully...`);

  globalDeploymentEmitter.removeAllListeners();
  deploymentLogEmitter.removeAllListeners();

  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
  Logger.info("HTTP server closed");

  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    Logger.info("Database connection closed");
  }
}

function handleSignal(signal: string): void {
  shutdown(signal)
    .then(() => process.exit(0))
    .catch((err) => ErrorHandler.handleFatalError(err, `Shutdown(${signal})`));
}

process.on("SIGTERM", () => handleSignal("SIGTERM"));
process.on("SIGINT", () => handleSignal("SIGINT"));

process.on("uncaughtException", (err) =>
  ErrorHandler.handleFatalError(
    err instanceof Error ? err : new Error(String(err)),
    "UncaughtException"
  )
);

process.on("unhandledRejection", (reason) =>
  ErrorHandler.handleFatalError(
    reason instanceof Error ? reason : new Error(String(reason)),
    "UnhandledRejection"
  )
);

start().catch((err) => ErrorHandler.handleFatalError(err, "ServerBootstrap"));