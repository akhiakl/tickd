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
  // This person's *elected* IANA zone (e.g. "America/Chicago") - a
  // preference, not a live device reading. Defaults once from
  // Intl.DateTimeFormat().resolvedOptions().timeZone the first time
  // src/components/timezone-sync.tsx runs (never overwriting it again
  // after that - see setTimezone's comment in
  // src/server/actions/account.ts), and from then on only changes when
  // the person picks a new one in Account settings
  // (setTimezonePreference). Null until either happens (a user who never
  // opened a client page after this shipped, or a cron run before any
  // sync). Drives: when a push notification fires for this person
  // (src/server/queries/nudge-candidates.ts), their own "today"/streak/
  // history (src/server/queries/group-snapshot.ts's localToday/
  // localCountsByDate), and the live clock other members see next to
  // their name. The Wall's shared grid and `daily_checks.date` itself
  // stay on UTC regardless - see MemberSnapshot's comments in
  // src/types/domain.ts.
  timezone: text("timezone"),
  reminderEnabled: boolean("reminder_enabled").notNull().default(true),
  weeklyRecapEnabled: boolean("weekly_recap_enabled").notNull().default(true),
  showStreaks: boolean("show_streaks").notNull().default(true),
  hideFromRanks: boolean("hide_from_ranks").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
