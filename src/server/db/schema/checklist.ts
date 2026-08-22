import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { groups } from "./groups";

export const checklistItems = pgTable(
  "checklist_items",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("checklist_items_group_id_idx").on(table.groupId)],
);

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type NewChecklistItem = typeof checklistItems.$inferInsert;
