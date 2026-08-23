import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * App-level user profile. When Auth0 is enabled (`isAuth0Enabled()`),
 * identity itself (password, OAuth tokens) lives with Auth0 and this row is
 * keyed by the Auth0 `sub` claim in `authSub`/`email`. When it's disabled,
 * a user is a guest who just typed a display name - `authSub`/`email` are
 * null (Postgres allows multiple nulls under a unique constraint, so
 * uniqueness among real Auth0 identities is unaffected) and `isGuest` is
 * true. Either way this row holds only what the product needs - display
 * name, avatar color/pattern, and notification preferences.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  authSub: text("auth_sub").unique(),
  email: text("email").unique(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  // Drives the identicon pattern (src/lib/identicon.ts) - `color` stays
  // the pattern's foreground color, this is the shape. Every insert path
  // supplies a fresh `crypto.randomUUID()`; no app-level default.
  avatarSeed: text("avatar_seed").notNull(),
  isGuest: boolean("is_guest").notNull().default(false),
  reminderEnabled: boolean("reminder_enabled").notNull().default(true),
  weeklyRecapEnabled: boolean("weekly_recap_enabled").notNull().default(true),
  showStreaks: boolean("show_streaks").notNull().default(true),
  hideFromRanks: boolean("hide_from_ranks").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
