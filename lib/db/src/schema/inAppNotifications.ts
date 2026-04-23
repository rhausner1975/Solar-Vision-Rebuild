import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const inAppNotificationsTable = pgTable(
  "in_app_notifications",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => ({
    createdAtIdx: index("in_app_notifications_created_at_idx").on(table.createdAt),
  }),
);

export type InAppNotification = typeof inAppNotificationsTable.$inferSelect;
