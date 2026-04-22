import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { adminUsersTable } from "./adminUsers";

export const adminSessionsTable = pgTable("admin_sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => adminUsersTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminSession = typeof adminSessionsTable.$inferSelect;
