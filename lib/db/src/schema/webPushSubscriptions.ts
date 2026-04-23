import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const webPushSubscriptionsTable = pgTable(
  "web_push_subscriptions",
  {
    id: serial("id").primaryKey(),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    lastError: text("last_error"),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
  },
  (table) => ({
    createdAtIdx: index("web_push_subscriptions_created_at_idx").on(table.createdAt),
  }),
);

export type WebPushSubscription = typeof webPushSubscriptionsTable.$inferSelect;
