import { date, index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { checklistItems } from "./checklist";
import { groups } from "./groups";
import { users } from "./users";

export const dailyChecks = pgTable(
  "daily_checks",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    checklistItemId: text("checklist_item_id")
      .notNull()
      .references(() => checklistItems.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.userId, table.checklistItemId, table.date),
    // getGroupSnapshot pulls every check for a group in one query.
    index("daily_checks_group_id_idx").on(table.groupId),
  ],
);

export type DailyCheck = typeof dailyChecks.$inferSelect;
export type NewDailyCheck = typeof dailyChecks.$inferInsert;
