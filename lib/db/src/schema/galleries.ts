import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const galleriesTable = pgTable("galleries", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Gallery = typeof galleriesTable.$inferSelect;
