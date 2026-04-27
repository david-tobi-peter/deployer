import "reflect-metadata";
import express from "express";
import cors from "cors";
import { v4 as uuid } from "uuid";
import apiRoutes from "@/routes/index.js";
import { Logger, als } from "@loggers/index.js";
import { ErrorHandler, ResourceNotFoundError } from "@errors/index.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  als.run({ traceId: uuid() }, () => {
    Logger.info(`Incoming Request: ${req.method} ${req.originalUrl}`);
    next();
  });
});

app.use("/api", apiRoutes);

app.use((req, res) => {
  ErrorHandler.handleError(
    new ResourceNotFoundError(`Route ${req.method} ${req.originalUrl} not found`),
    res
  );
});