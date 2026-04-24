import config from "@/config/index.js";

export enum ERROR_TYPE_ENUM {
  BAD_REQUEST = "BAD_REQUEST",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR"
}

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  public readonly type: ERROR_TYPE_ENUM;

  constructor(type: ERROR_TYPE_ENUM, message?: string) {
    super(message);
    Object.setPrototypeOf(this, Error.prototype);
    this.type = type;
  }

  toApiObject() {
    return {
      type: this.type,
      message: this.message,
      ...(!config.app.isProduction && { stack: this.stack })
    };
  }
}

export class BadRequestError extends AppError {
  readonly statusCode = 400;
  constructor(message?: string) {
    super(ERROR_TYPE_ENUM.BAD_REQUEST, message || "Bad Request");
  }
}

export class ResourceNotFoundError extends AppError {
  readonly statusCode = 404;
  constructor(message?: string) {
    super(ERROR_TYPE_ENUM.RESOURCE_NOT_FOUND, message || "Resource Not Found");
  }
}

export class InternalServerError extends AppError {
  readonly statusCode = 500;
  constructor(message?: string) {
    super(ERROR_TYPE_ENUM.INTERNAL_SERVER_ERROR, message || "Internal Server Error");
  }
}

export class DatabaseError extends AppError {
  readonly statusCode = 500;
  constructor(message?: string) {
    super(ERROR_TYPE_ENUM.DATABASE_ERROR, message || "Database Error");
  }
}
