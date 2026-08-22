import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __tickdSql: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  }
  // `prepare: false` is required for connection poolers (Neon/Vercel Postgres
  // pooled connection strings, PgBouncer) that don't support prepared
  // statements across pooled connections.
  return postgres(url, { prepare: false });
}

// Reuse the connection across hot reloads / lambda warm invocations instead
// of opening a new pool per request.
const sql = globalThis.__tickdSql ?? createClient();
if (process.env.NODE_ENV !== "production") globalThis.__tickdSql = sql;

export const db = drizzle(sql, { schema });
