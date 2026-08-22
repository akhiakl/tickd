import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/server/db/schema";
import { AVATAR_SWATCHES, DEFAULT_CHECKLIST_ITEMS } from "../src/lib/constants";
import { dateRange, todayISODate, daysBetween } from "../src/lib/challenge-stats";

/**
 * Seeds one realistic sample group ("The August Eight") with 15 members and
 * a couple of weeks of check-in history, so a fresh database has something
 * to look at immediately after `npm run db:migrate`.
 */

const SAMPLE_NAMES = [
  "Ada",
  "Priya",
  "Marcus",
  "Lena",
  "Tomas",
  "Aisha",
  "Ben",
  "Chloe",
  "Diego",
  "Nour",
  "Sam",
  "Ines",
  "Kofi",
  "Mira",
  "Jonas",
];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const sql = postgres(url, { prepare: false });
  const db = drizzle(sql, { schema });

  const startDate = dateRange(todayISODate(), 1)[0];
  const daysElapsed = Math.min(11, daysBetween(startDate, todayISODate()));
  const groupId = crypto.randomUUID();

  console.log("Seeding users...");
  const userIds = await Promise.all(
    SAMPLE_NAMES.map(async (name, i) => {
      const id = crypto.randomUUID();
      await db.insert(schema.users).values({
        id,
        authSub: `seed|${id}`,
        email: `${name.toLowerCase()}@example.com`,
        name,
        color: AVATAR_SWATCHES[i % AVATAR_SWATCHES.length],
      });
      return id;
    }),
  );

  console.log("Seeding group...");
  await db.insert(schema.groups).values({
    id: groupId,
    name: "The August Eight",
    inviteCode: "AUG8-2K4X",
    startDate,
    durationDays: 31,
    createdByUserId: userIds[0],
  });

  await db.insert(schema.groupMembers).values(
    userIds.map((userId, i) => ({
      groupId,
      userId,
      role: i === 0 ? ("admin" as const) : ("member" as const),
    })),
  );

  console.log("Seeding checklist...");
  const itemIds = await Promise.all(
    DEFAULT_CHECKLIST_ITEMS.map(async (label, position) => {
      const id = crypto.randomUUID();
      await db.insert(schema.checklistItems).values({ id, groupId, label, position });
      return id;
    }),
  );

  console.log("Seeding check history...");
  const dates = dateRange(startDate, daysElapsed);
  const checkRows: (typeof schema.dailyChecks.$inferInsert)[] = [];
  userIds.forEach((userId, i) => {
    const rand = mulberry32(i + 7);
    const rigor = i === 0 ? 0.85 : 0.35 + rand() * 0.6;
    for (const date of dates) {
      const roll = rand();
      const itemsDoneToday = roll < rigor ? itemIds : itemIds.filter(() => rand() < 0.5);
      for (const checklistItemId of itemsDoneToday) {
        checkRows.push({
          id: crypto.randomUUID(),
          groupId,
          userId,
          checklistItemId,
          date,
        });
      }
    }
  });
  if (checkRows.length > 0) await db.insert(schema.dailyChecks).values(checkRows);

  console.log(`Done. Group "The August Eight" seeded with ${userIds.length} members.`);
  await sql.end();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
