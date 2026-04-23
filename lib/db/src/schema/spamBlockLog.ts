import { index, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const spamBlockLogTable = pgTable(
  "spam_block_log",
  {
    id: serial("id").primaryKey(),
    formName: text("form_name").notNull(),
    reason: text("reason").notNull(),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("spam_block_log_created_at_idx").on(t.createdAt),
  }),
);

export type SpamBlockLog = typeof spamBlockLogTable.$inferSelect;
