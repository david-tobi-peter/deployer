import type { Response } from "express";
import { Logger } from "@loggers/index.js";
import { AppError, InternalServerError, DatabaseError } from "./app.error.js";
import { QueryFailedError } from "typeorm";
import config from "@/config/index.js";

export class ErrorHandler {
  /**
   * @private
   * @static
   * @param {unknown} error
   * @returns {AppError}
   */
  private static normalizeError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof QueryFailedError || (typeof error === "object" && error !== null && "driverError" in error)) {
      const message = config.app.isProduction
        ? "Database error occurred"
        : (error instanceof Error ? error.message : "Database error occurred");

      return new DatabaseError(message);
    }

    if (error instanceof Error) {
      return new InternalServerError(error.message);
    }

    return new InternalServerError(typeof error === "string" ? error : "An unknown error occurred");
  }

  /**
   * @static
   * @param {unknown} error
   * @param {Response} res
   * @returns {void}
   */
  static handleError(error: unknown, res: Response): void {
    const normalizedError = this.normalizeError(error);

    Logger.error(`[${normalizedError.type}] ${normalizedError.message}`, normalizedError);

    res.status(normalizedError.statusCode).json({ error: normalizedError.toApiObject() });
  }

  /**
   * @static
   * @param {unknown} error
   * @param {string} source
   * @returns {void}
   */
  static handleFatalError(error: unknown, source: string): void {
    Logger.error(`FATAL ERROR [${source}]:`, error);

    setTimeout(() => process.exit(1), 500);
  }
}
