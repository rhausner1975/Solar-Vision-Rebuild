import { pgTable, integer, jsonb, text, timestamp } from "drizzle-orm/pg-core";

export const notificationSettingsTable = pgTable("notification_settings", {
  id: integer("id").primaryKey().default(1),
  recipients: jsonb("recipients").$type<string[]>().notNull().default([]),
  smsRecipient: text("sms_recipient"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type NotificationSettings = typeof notificationSettingsTable.$inferSelect;
