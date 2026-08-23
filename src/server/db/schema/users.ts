import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * App-level user profile. When Auth0 is enabled (`isAuth0Enabled()`),
 * identity itself (password, OAuth tokens) lives with Auth0 and this row is
 * keyed by the Auth0 `sub` claim in `authSub`/`email`. When it's disabled,
 * a user starts as a guest who just typed a display name - `authSub`/
 * `email` are null (Postgres allows multiple nulls under a unique
 * constraint, so uniqueness among real Auth0 identities is unaffected) and
 * `isGuest` is true. A guest can optionally set `username`/`passwordHash`
 * later (see src/server/actions/auth.ts's `setCredentials`) to log back
 * into that same row from another device - `isGuest` stays true either
 * way, it only ever means "not an Auth0 identity."
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  authSub: text("auth_sub").unique(),
  email: text("email").unique(),
  // Lowercased at write time (see usernameSchema) so uniqueness and lookups
  // are case-insensitive without a citext extension or a functional index.
  username: text("username").unique(),
  // scrypt hash, see src/server/auth/password.ts - "salt:hash", both hex.
  // Null until a guest opts into setting credentials.
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  color: text("color").notNull(),
  // Drives the identicon pattern (src/lib/identicon.ts) - `color` stays
  // the pattern's foreground color, this is the shape. Every insert path
  // supplies a fresh `crypto.randomUUID()`; no app-level default.
  avatarSeed: text("avatar_seed").notNull(),
  isGuest: boolean("is_guest").notNull().default(false),
  // IANA zone name (e.g. "America/Chicago"), captured client-side from
  // Intl.DateTimeFormat().resolvedOptions().timeZone - see
  // src/components/timezone-sync.tsx. Null until that first happens
  // (a user who never opens a client page after this shipped, or a cron
  // run before any client sync). Used only for *when* a push notification
  // fires for this person (src/server/queries/nudge-candidates.ts) - not
  // for the shared group "today"/day-index, which stays on the server's
  // clock since that's group state multiple members (possibly in
  // different zones) all see the same value for.
  timezone: text("timezone"),
  reminderEnabled: boolean("reminder_enabled").notNull().default(true),
  weeklyRecapEnabled: boolean("weekly_recap_enabled").notNull().default(true),
  showStreaks: boolean("show_streaks").notNull().default(true),
  hideFromRanks: boolean("hide_from_ranks").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
