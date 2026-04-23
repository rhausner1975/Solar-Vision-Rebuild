import { pgTable, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const notificationSettingsTable = pgTable("notification_settings", {
  id: integer("id").primaryKey().default(1),
  recipients: jsonb("recipients").$type<string[]>().notNull().default([]),
  smsRecipients: jsonb("sms_recipients").$type<string[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type NotificationSettings = typeof notificationSettingsTable.$inferSelect;
