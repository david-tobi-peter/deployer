import { config } from "dotenv";
import path from "path";

config({ path: ".env" });

type DeepReadonly<T> = T extends (...args: any[]) => any
  ? T
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

export function deepFreeze<T extends object>(obj: T): DeepReadonly<T> {
  if (Object.isFrozen(obj)) return obj as DeepReadonly<T>;

  Object.freeze(obj);

  for (const key of [...Object.getOwnPropertyNames(obj), ...Object.getOwnPropertySymbols(obj)]) {
    const value = (obj as any)[key];

    if (value && (typeof value === "object" || typeof value === "function") && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  return obj as DeepReadonly<T>;
}

const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), "storage");
const dbName = process.env.DB_DATABASE || path.join(STORAGE_DIR, "database.sqlite");

const app = {
  environment: process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  PORT: +(process.env.PORT || 3000),
  STORAGE_DIR,
  BUILDKIT_HOST: process.env.BUILDKIT_HOST || "docker-container://buildkit",
  DEPLOYMENT_PORT_START: +(process.env.DEPLOYMENT_PORT_START || 4000)
};

const db = {
  type: "sqlite" as const,
  database: dbName,
};

export default deepFreeze({
  app,
  db,
});
