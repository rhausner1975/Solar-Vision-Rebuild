import { Router, type IRouter } from "express";
import { asc, eq, and } from "drizzle-orm";
import {
  db,
  contactSubmissionsTable,
  estimateRequestsTable,
  galleriesTable,
  galleryImagesTable,
} from "@workspace/db";
import {
  CreateContactSubmissionBody,
  CreateEstimateRequestBody,
  GetPublicGalleryParams,
} from "@workspace/api-zod";
import { publicFormLimiter } from "../lib/rateLimit";
import { notifyContactSubmission, notifyEstimateRequest } from "../lib/notify";

const router: IRouter = Router();

router.post("/contact-submissions", publicFormLimiter, async (req, res): Promise<void> => {
  const parsed = CreateContactSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(contactSubmissionsTable)
    .values(parsed.data)
    .returning({ id: contactSubmissionsTable.id });
  notifyContactSubmission(parsed.data);
  res.status(201).json({ id: row.id, ok: true });
});

router.post("/estimate-requests", publicFormLimiter, async (req, res): Promise<void> => {
  const parsed = CreateEstimateRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(estimateRequestsTable)
    .values(parsed.data)
    .returning({ id: estimateRequestsTable.id });
  notifyEstimateRequest(parsed.data as Record<string, unknown>);
  res.status(201).json({ id: row.id, ok: true });
});

router.get("/public/galleries", async (_req, res): Promise<void> => {
  const galleries = await db
    .select()
    .from(galleriesTable)
    .where(eq(galleriesTable.published, true))
    .orderBy(asc(galleriesTable.createdAt));
  const images = galleries.length
    ? await db.select().from(galleryImagesTable).orderBy(asc(galleryImagesTable.sortOrder))
    : [];
  res.json(
    galleries.map((g) => ({ ...g, images: images.filter((i) => i.galleryId === g.id) })),
  );
});

router.get("/public/galleries/:slug", async (req, res): Promise<void> => {
  const params = GetPublicGalleryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [gallery] = await db
    .select()
    .from(galleriesTable)
    .where(and(eq(galleriesTable.slug, params.data.slug), eq(galleriesTable.published, true)));
  if (!gallery) {
    res.status(404).json({ error: "Gallery not found" });
    return;
  }
  const images = await db
    .select()
    .from(galleryImagesTable)
    .where(eq(galleryImagesTable.galleryId, gallery.id))
    .orderBy(asc(galleryImagesTable.sortOrder));
  res.json({ ...gallery, images });
});

export default router;
