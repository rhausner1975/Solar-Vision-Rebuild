import { sql } from "drizzle-orm";
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
    unreadIdx: index("in_app_notifications_unread_idx")
      .on(table.createdAt)
      .where(sql`${table.readAt} IS NULL`),
    readAtIdx: index("in_app_notifications_read_at_idx").on(table.readAt),
  }),
);

export type InAppNotification = typeof inAppNotificationsTable.$inferSelect;
