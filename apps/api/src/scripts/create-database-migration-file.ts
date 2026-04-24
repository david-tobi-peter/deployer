import { execa } from "execa";
import path from "path";

const migrationName = process.argv[2];

if (!migrationName) {
  console.error("Please provide a migration name.");
  process.exit(1);
}

const migrationsDir = "src/db/migrations";
const typeormCli = "./node_modules/typeorm/cli.js";

try {
  console.log(`Creating migration file: ${migrationName}...`);
  await execa("npx", ["tsx", typeormCli, "migration:create", path.join(migrationsDir, migrationName)], {
    stdio: "inherit",
  });
} catch (error) {
  console.error(`Failed to create migration file: ${error}`);
  process.exit(1);
}