import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * App-level user profile. Identity itself (password, OAuth tokens, OTP
 * verification) lives with Auth0; this row is keyed by the Auth0 `sub`
 * claim and holds only the fields the product needs - display name,
 * avatar color, and notification preferences.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  authSub: text("auth_sub").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  reminderEnabled: boolean("reminder_enabled").notNull().default(true),
  weeklyRecapEnabled: boolean("weekly_recap_enabled").notNull().default(true),
  showStreaks: boolean("show_streaks").notNull().default(true),
  hideFromRanks: boolean("hide_from_ranks").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
