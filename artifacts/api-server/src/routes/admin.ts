import { Router, type IRouter } from "express";
import { asc, desc, eq } from "drizzle-orm";
import {
  db,
  adminUsersTable,
  contactSubmissionsTable,
  estimateRequestsTable,
  galleriesTable,
  galleryImagesTable,
} from "@workspace/db";
import {
  AdminLoginBody,
  AdminChangePasswordBody,
  CreateGalleryBody,
  UpdateGalleryBody,
  UpdateGalleryParams,
  DeleteGalleryParams,
  DeleteContactSubmissionParams,
  DeleteEstimateRequestParams,
  AddGalleryImageBody,
  AddGalleryImageParams,
  UpdateGalleryImageBody,
  UpdateGalleryImageParams,
  DeleteGalleryImageParams,
} from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getCurrentAdmin,
  requireAdmin,
  revokeOtherSessions,
  getCurrentSessionId,
} from "../lib/auth";

const router: IRouter = Router();

function publicAdmin(user: { id: number; username: string; mustChangePassword: boolean; createdAt: Date }) {
  return {
    id: user.id,
    username: user.username,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
  };
}

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password } = parsed.data;
  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, username));
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    req.log.warn({ username }, "Failed admin login");
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  await createSession(user.id, res);
  res.json(publicAdmin(user));
});

router.post("/admin/logout", async (req, res): Promise<void> => {
  await destroySession(req, res);
  res.status(204).end();
});

router.get("/admin/me", async (req, res): Promise<void> => {
  const user = await getCurrentAdmin(req);
  if (!user) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  res.json(publicAdmin(user));
});

router.post("/admin/password", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const admin = (req as unknown as { admin: { id: number } }).admin;
  const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, admin.id));
  if (!user || !(await verifyPassword(user.passwordHash, parsed.data.currentPassword))) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }
  const newHash = await hashPassword(parsed.data.newPassword);
  await db
    .update(adminUsersTable)
    .set({ passwordHash: newHash, mustChangePassword: false })
    .where(eq(adminUsersTable.id, user.id));
  const currentSessionId = getCurrentSessionId(req);
  if (currentSessionId) {
    await revokeOtherSessions(user.id, currentSessionId);
  }
  res.status(204).end();
});

router.get("/admin/contact-submissions", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(contactSubmissionsTable)
    .orderBy(desc(contactSubmissionsTable.createdAt));
  res.json(rows);
});

router.delete("/admin/contact-submissions/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteContactSubmissionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(contactSubmissionsTable).where(eq(contactSubmissionsTable.id, params.data.id));
  res.status(204).end();
});

router.get("/admin/estimate-requests", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(estimateRequestsTable)
    .orderBy(desc(estimateRequestsTable.createdAt));
  res.json(rows);
});

router.delete("/admin/estimate-requests/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteEstimateRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(estimateRequestsTable).where(eq(estimateRequestsTable.id, params.data.id));
  res.status(204).end();
});

router.get("/admin/galleries", requireAdmin, async (_req, res): Promise<void> => {
  const galleries = await db.select().from(galleriesTable).orderBy(asc(galleriesTable.createdAt));
  const images = await db.select().from(galleryImagesTable).orderBy(asc(galleryImagesTable.sortOrder));
  res.json(
    galleries.map((g) => ({ ...g, images: images.filter((i) => i.galleryId === g.id) })),
  );
});

router.post("/admin/galleries", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateGalleryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(galleriesTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/admin/galleries/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateGalleryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateGalleryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(galleriesTable)
    .set(parsed.data)
    .where(eq(galleriesTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Gallery not found" });
    return;
  }
  res.json(row);
});

router.delete("/admin/galleries/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteGalleryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(galleriesTable).where(eq(galleriesTable.id, params.data.id));
  res.status(204).end();
});

router.post("/admin/galleries/:id/images", requireAdmin, async (req, res): Promise<void> => {
  const params = AddGalleryImageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddGalleryImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(galleryImagesTable)
    .values({
      galleryId: params.data.id,
      objectPath: parsed.data.objectPath,
      caption: parsed.data.caption ?? null,
      altText: parsed.data.altText ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
    })
    .returning();
  res.status(201).json(row);
});

router.patch("/admin/gallery-images/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateGalleryImageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateGalleryImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.caption !== undefined) updates.caption = parsed.data.caption;
  if (parsed.data.altText !== undefined) updates.altText = parsed.data.altText;
  if (parsed.data.sortOrder !== undefined && parsed.data.sortOrder !== null)
    updates.sortOrder = parsed.data.sortOrder;
  const [row] = await db
    .update(galleryImagesTable)
    .set(updates)
    .where(eq(galleryImagesTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  res.json(row);
});

router.delete("/admin/gallery-images/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteGalleryImageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(galleryImagesTable).where(eq(galleryImagesTable.id, params.data.id));
  res.status(204).end();
});

export default router;
