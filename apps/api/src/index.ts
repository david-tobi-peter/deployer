import "reflect-metadata";
import express from "express";
import cors from "cors";
import config from "@/config/index.js";
import { AppDataSource } from "@/db/data-source.js";
import { Logger } from "@loggers/index.js";
import { ErrorHandler, ResourceNotFoundError } from "@errors/index.js";
import apiRoutes from "@/routes/index.js";
import { v4 as uuid } from "uuid";
import { als } from "@loggers/index.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const traceId = uuid();
  als.run({ traceId }, () => {
    Logger.info(`Incoming Request: ${req.method} ${req.originalUrl}`);
    next();
  });
});

app.use("/api", apiRoutes);

app.use((req, res) => {
  ErrorHandler.handleError(new ResourceNotFoundError(`Route ${req.method} ${req.originalUrl} not found`), res);
});

async function startServer() {
  try {
    await AppDataSource.initialize();
    Logger.info("Database initialized correctly");

    const port = config.app.PORT || 3000;
    app.listen(port, () => {
      Logger.info(`Deployer Control Plane running gracefully on port ${port}`);
    });
  } catch (error) {
    ErrorHandler.handleFatalError(error, "ServerBootstrap");
  }
}

process.on("uncaughtException", (error: Error) => {
  ErrorHandler.handleFatalError(error, "UncaughtException");
});

startServer();
