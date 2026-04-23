import { pgTable, serial, text, boolean, timestamp, real, integer, date } from "drizzle-orm/pg-core";

export const galleriesTable = pgTable("galleries", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  systemSizeKw: real("system_size_kw"),
  panelBrand: text("panel_brand"),
  inverterBrand: text("inverter_brand"),
  installDate: date("install_date", { mode: "date" }),
  durationDays: integer("duration_days"),
  story: text("story"),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Gallery = typeof galleriesTable.$inferSelect;
