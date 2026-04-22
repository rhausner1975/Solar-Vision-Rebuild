import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { galleriesTable } from "./galleries";

export const galleryImagesTable = pgTable("gallery_images", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull().references(() => galleriesTable.id, { onDelete: "cascade" }),
  objectPath: text("object_path").notNull(),
  caption: text("caption"),
  altText: text("alt_text"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GalleryImage = typeof galleryImagesTable.$inferSelect;
