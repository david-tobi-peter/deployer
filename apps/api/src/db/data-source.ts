import "reflect-metadata";
import { DataSource } from "typeorm";
import config from "@/config/index.js";
import * as entities from "@/db/entities/index.js";
import * as migrations from "@/db/migrations/index.js";

export const AppDataSource = new DataSource({
  ...config.db,
  entities: Object.values(entities),
  migrations: Object.values(migrations),
  synchronize: false,
  migrationsRun: true,
  logging: true,
  maxQueryExecutionTime: 500,
  migrationsTransactionMode: "all",
});
