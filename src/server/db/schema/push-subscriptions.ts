import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * One row per browser/device that's granted push permission - a user with
 * several devices has several rows. `endpoint` is the push service URL
 * the browser gave us (unique per subscription, effectively a bearer
 * credential for that device), `p256dh`/`auth` are the keys required to
 * encrypt a payload to it. All three come straight from the
 * `PushSubscription` object `pushManager.subscribe()` returns client-side
 * - see src/lib/push-subscribe.ts.
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("push_subscriptions_user_id_idx").on(table.userId)],
);

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscriptionRow = typeof pushSubscriptions.$inferInsert;
