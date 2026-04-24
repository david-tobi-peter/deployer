import "reflect-metadata";
import config from "@/config/index.js";
import { type Logger as TypeORMLogger } from "typeorm";
import { Logger } from "./winston.logger.js";

export class TypeORMCustomLogger implements TypeORMLogger {
  logQuery(query: string, parameters?: unknown[]) {
    if (config.app.isDev) {
      Logger.debug(`Query: ${query}`, { parameters });
    }
  }

  logQueryError(error: string | Error, query: string, parameters?: unknown[]) {
    Logger.error(`Query Error: ${query}`, { error, parameters });
  }

  logQuerySlow(time: number, query: string, parameters?: unknown[]) {
    Logger.warn(`Slow Query (${time}ms): ${query}`, { parameters });
  }

  logSchemaBuild(message: string) {
    Logger.info(`Schema: ${message}`);
  }

  logMigration(message: string) {
    Logger.info(`Migration: ${message}`);
  }

  log(level: "log" | "info" | "warn", message: unknown) {
    const logLevel = level === "log" ? "info" : level;
    Logger[logLevel](message as string);
  }
} 
