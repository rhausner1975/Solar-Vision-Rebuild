import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { adminUsersTable } from "./adminUsers";

export const passwordResetTokensTable = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => adminUsersTable.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("password_reset_tokens_user_id_idx").on(t.userId),
  }),
);

export type PasswordResetToken = typeof passwordResetTokensTable.$inferSelect;
