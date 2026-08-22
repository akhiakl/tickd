import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "node:path";
import { resetDatabase, closeTestDb } from "./fixtures/db";

/**
 * Runs once before the whole suite: applies every migration to the test
 * database (creating it fresh is the operator's job - see the README's
 * E2E testing section) and truncates any leftover rows from a previous
 * run. Individual specs seed their own fresh group/user rows on top of
 * this empty baseline.
 */
export default async function globalSetup() {
  const connectionString =
    process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/tickd_test";
  const sql = postgres(connectionString, { max: 1, prepare: false });
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder: path.resolve(__dirname, "../../drizzle") });
  await sql.end();

  await resetDatabase();
  await closeTestDb();
}
