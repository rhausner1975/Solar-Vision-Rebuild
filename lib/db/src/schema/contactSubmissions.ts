import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const contactSubmissionsTable = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  emailStatus: text("email_status").notNull().default("pending"),
  emailError: text("email_error"),
  emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
  emailAttempts: integer("email_attempts").notNull().default(0),
  emailNextRetryAt: timestamp("email_next_retry_at", { withTimezone: true }),
  smsStatus: text("sms_status").notNull().default("pending"),
  smsError: text("sms_error"),
  smsSentAt: timestamp("sms_sent_at", { withTimezone: true }),
  smsAttempts: integer("sms_attempts").notNull().default(0),
  smsNextRetryAt: timestamp("sms_next_retry_at", { withTimezone: true }),
});

export type ContactSubmission = typeof contactSubmissionsTable.$inferSelect;
