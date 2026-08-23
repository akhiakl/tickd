import "dotenv/config";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/server/db/schema";
import { AVATAR_SWATCHES } from "../src/lib/constants";

/**
 * Local-testing helper, not part of the main seed flow (scripts/seed.ts
 * seeds Auth0-style users with authSub set, which never see the
 * username/password UI at all): inserts a handful of guest users that
 * already have a username + password set. Lets you try the "taken" case
 * in the live username check without opening a second browser session,
 * and log in as one of them at /signin/password.
 *
 * hashPassword is duplicated from src/server/auth/password.ts rather than
 * imported: that module opens with `import "server-only"`, a guard
 * against it being reachable from the client bundle, which also makes it
 * unresolvable under plain `tsx` outside Next's own build (same reason
 * scripts/seed.ts reimplements its own PRNG rather than importing one).
 * Keep this in sync with password.ts's algorithm if that ever changes.
 *
 * Run with: pnpm exec tsx scripts/seed-usernames.ts
 */

const scrypt = promisify(scryptCallback);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

const SAMPLE_USERS = [
  { name: "Ada", username: "ada", password: "adapassword" },
  { name: "Priya", username: "priya", password: "priyapassword" },
  { name: "Marcus", username: "marcus", password: "marcuspassword" },
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const sql = postgres(url, { prepare: false });
  const db = drizzle(sql, { schema });

  for (const [i, u] of SAMPLE_USERS.entries()) {
    const existing = await db.query.users.findFirst({
      where: (t, { eq }) => eq(t.username, u.username),
    });
    if (existing) {
      console.log(`@${u.username} already exists, skipping.`);
      continue;
    }

    await db.insert(schema.users).values({
      id: crypto.randomUUID(),
      name: u.name,
      username: u.username,
      passwordHash: await hashPassword(u.password),
      color: AVATAR_SWATCHES[i % AVATAR_SWATCHES.length],
      avatarSeed: crypto.randomUUID(),
      isGuest: true,
    });
    console.log(`Seeded @${u.username} (password: ${u.password}).`);
  }

  await sql.end();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
