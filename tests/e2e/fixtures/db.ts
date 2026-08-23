import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql as rawSql } from "drizzle-orm";
import * as schema from "../../../src/server/db/schema";
import { DEFAULT_CHECKLIST_ITEMS, AVATAR_SWATCHES } from "../../../src/lib/constants";
import { toISODate } from "../../../src/lib/challenge-stats";

/**
 * A standalone Drizzle client for the E2E suite - deliberately not the
 * app's own `src/server/db` singleton, so test setup can run from plain
 * Node/tsx without pulling in the app's server-only module boundary.
 */
const connectionString =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/tickd_test";
const sql = postgres(connectionString, { prepare: false });
export const testDb = drizzle(sql, { schema });

export async function closeTestDb() {
  await sql.end();
}

/** Wipes every table between full test runs. Individual specs seed their own fresh rows on top. */
export async function resetDatabase() {
  await testDb.execute(
    rawSql`TRUNCATE TABLE daily_checks, checklist_items, group_members, groups, users RESTART IDENTITY CASCADE`,
  );
}

function uniqueSuffix() {
  return crypto.randomUUID().slice(0, 8);
}

export type SeededUser = {
  id: string;
  email: string;
  name: string;
  color: string;
  avatarSeed: string;
};

/** Creates a standalone user with no group membership - for join-flow tests. */
export async function seedLoneUser(name = "Nora"): Promise<SeededUser> {
  const suffix = uniqueSuffix();
  const id = crypto.randomUUID();
  const email = `${name.toLowerCase()}-${suffix}@example.com`;
  const avatarSeed = crypto.randomUUID();
  await testDb.insert(schema.users).values({
    id,
    authSub: `seed|${id}`,
    email,
    name,
    color: AVATAR_SWATCHES[0],
    avatarSeed,
  });
  return { id, email, name, color: AVATAR_SWATCHES[0], avatarSeed };
}

export type SeededGroup = {
  groupId: string;
  groupName: string;
  inviteCode: string;
  durationDays: number;
  startDate: string;
  items: { id: string; label: string }[];
  admin: SeededUser;
  members: SeededUser[];
};

/**
 * Creates a fresh group with a checklist and three members (one admin, two
 * plain members), each with a unique email so parallel spec files never
 * collide. When `historyDays` is set, seeds deterministic check history for
 * every day before "today": the admin ticks everything, the first member
 * ticks exactly half the items, and the second member ticks nothing -
 * giving Ranks/Profile tests a stable, non-flaky ordering to assert on.
 */
export async function seedFreshGroup(options?: { historyDays?: number }): Promise<SeededGroup> {
  const historyDays = options?.historyDays ?? 0;
  const suffix = uniqueSuffix();
  const groupId = crypto.randomUUID();
  const groupName = `Test Group ${suffix}`;
  const inviteCode = `TEST-${suffix.toUpperCase()}`;
  const durationDays = 31;
  const startDate = toISODate(new Date(Date.now() - historyDays * 86_400_000));

  const makeUser = async (name: string): Promise<SeededUser> => {
    const id = crypto.randomUUID();
    const email = `${name.toLowerCase()}-${suffix}@example.com`;
    const avatarSeed = crypto.randomUUID();
    await testDb.insert(schema.users).values({
      id,
      authSub: `seed|${id}`,
      email,
      name,
      color: AVATAR_SWATCHES[0],
      avatarSeed,
    });
    return { id, email, name, color: AVATAR_SWATCHES[0], avatarSeed };
  };

  const admin = await makeUser("Ada");
  const member1 = await makeUser("Priya");
  const member2 = await makeUser("Marcus");

  await testDb.insert(schema.groups).values({
    id: groupId,
    name: groupName,
    inviteCode,
    startDate,
    durationDays,
    createdByUserId: admin.id,
  });

  await testDb.insert(schema.groupMembers).values([
    { groupId, userId: admin.id, role: "admin" },
    { groupId, userId: member1.id, role: "member" },
    { groupId, userId: member2.id, role: "member" },
  ]);

  const items = await Promise.all(
    DEFAULT_CHECKLIST_ITEMS.map(async (label, position) => {
      const id = crypto.randomUUID();
      await testDb.insert(schema.checklistItems).values({ id, groupId, label, position });
      return { id, label };
    }),
  );

  if (historyDays > 0) {
    const half = items.slice(0, Math.floor(items.length / 2));
    const rows: (typeof schema.dailyChecks.$inferInsert)[] = [];
    for (let d = 0; d < historyDays; d++) {
      const date = toISODate(new Date(Date.now() - (historyDays - d) * 86_400_000));
      for (const item of items) {
        rows.push({
          id: crypto.randomUUID(),
          groupId,
          userId: admin.id,
          checklistItemId: item.id,
          date,
        });
      }
      for (const item of half) {
        rows.push({
          id: crypto.randomUUID(),
          groupId,
          userId: member1.id,
          checklistItemId: item.id,
          date,
        });
      }
    }
    await testDb.insert(schema.dailyChecks).values(rows);
  }

  return {
    groupId,
    groupName,
    inviteCode,
    durationDays,
    startDate,
    items,
    admin,
    members: [member1, member2],
  };
}
