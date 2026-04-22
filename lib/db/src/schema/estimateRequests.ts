import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const estimateRequestsTable = pgTable("estimate_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  propertyType: text("property_type"),
  projectType: text("project_type"),
  monthlyBill: text("monthly_bill"),
  timeline: text("timeline"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EstimateRequest = typeof estimateRequestsTable.$inferSelect;
