import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";
import { AsyncLocalStorage } from "async_hooks";
import config from "@/config/index.js";

const { combine, timestamp, printf, colorize } = winston.format;

const als = new AsyncLocalStorage<{ traceId?: string; deploymentId?: string }>();

const localFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const store = als.getStore();

  const traceId = store?.traceId
    ? ` [${store.traceId}]`
    : "";
  const deploymentId = store?.deploymentId
    ? ` [DEPLOY:${store.deploymentId}]`
    : "";

  let logMessage = `${timestamp} [${level.toUpperCase()}]${traceId}${deploymentId}: ${message}`;

  if (stack) {
    logMessage += `\n${stack}`;
  }

  return logMessage;
});

const logDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export class Logger {
  private static instance: winston.Logger;

  private constructor() { }

  private static getInstance(): winston.Logger {
    if (!Logger.instance) {
      if (config.app.environment === "test") {
        Logger.instance = winston.createLogger({ silent: true });
        return Logger.instance;
      }

      const transports: winston.transport[] = [
        new DailyRotateFile({
          dirname: logDir,
          filename: "application-%DATE%.log",
          datePattern: "YYYY-MM-DD",
          handleExceptions: true,
          level: "info",
        }),
      ];

      if (!config.app.isProduction) {
        transports.push(
          new winston.transports.Console({
            level: "debug",
            format: combine(colorize(), localFormat),
          })
        );
      }

      Logger.instance = winston.createLogger({
        level: "info",
        format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), localFormat),
        transports,
      });
    }

    return Logger.instance;
  }

  /**
   * @method info
   * @static
   * @param {string} message
   * @param {unknown} [meta]
   */
  public static info(message: string, meta?: unknown): void {
    this.getInstance().info(message, this.normalizeMeta(meta));
  }

  /**
   * @method error
   * @static
   * @param {string} message
   * @param {unknown} [error]
   * @param {unknown} [meta]
   */
  public static error(message: string, error?: unknown, meta?: unknown): void {
    const metaObj = this.normalizeMeta(meta);

    if (error instanceof Error) {
      this.getInstance().error(message, {
        ...metaObj,
        error: error.message,
        stack: error.stack,
      });
    } else if (error !== undefined) {
      this.getInstance().error(message, {
        ...metaObj,
        rawError: String(error),
      });
    } else {
      this.getInstance().error(message, metaObj);
    }
  }

  /**
   * @method warn
   * @static
   * @param {string} message
   * @param {unknown} [meta]
   */
  public static warn(message: string, meta?: unknown): void {
    this.getInstance().warn(message, this.normalizeMeta(meta));
  }

  /**
   * @method debug
   * @static
   * @param {string} message
   * @param {unknown} [meta]
   */
  public static debug(message: string, meta?: unknown): void {
    this.getInstance().debug(message, this.normalizeMeta(meta));
  }

  /**
   * @method normalizeMeta
   * @private
   * @static
   * @param {unknown} meta
   * @returns {object}
   */
  private static normalizeMeta(meta: unknown): object {
    if (meta === undefined || meta === null) return {};
    if (typeof meta === "object") return meta;
    return { meta };
  }
}
