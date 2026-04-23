import { pgTable, serial, text, jsonb, timestamp, integer } from "drizzle-orm/pg-core";

export const notificationLogTable = pgTable("notification_log", {
  id: serial("id").primaryKey(),
  channel: text("channel").notNull(),
  recipients: jsonb("recipients").$type<string[]>().notNull().default([]),
  subject: text("subject"),
  relatedKind: text("related_kind"),
  relatedId: integer("related_id"),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationLog = typeof notificationLogTable.$inferSelect;
