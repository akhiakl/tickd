import { index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { groups } from "./groups";
import { users } from "./users";

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["admin", "member"] })
      .notNull()
      .default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.userId] }),
    // The PK covers group_id lookups; user_id needs its own index for
    // "which groups is this person in" (the landing page, the switcher).
    index("group_members_user_id_idx").on(table.userId),
  ],
);

export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;
