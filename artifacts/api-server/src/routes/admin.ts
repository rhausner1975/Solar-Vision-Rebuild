import { Router, type IRouter } from "express";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import {
  db,
  adminUsersTable,
  contactSubmissionsTable,
  estimateRequestsTable,
  galleriesTable,
  galleryImagesTable,
  notificationSettingsTable,
  notificationLogTable,
  inAppNotificationsTable,
} from "@workspace/db";
import {
  AdminLoginBody,
  AdminChangePasswordBody,
  RequestAdminPasswordResetBody,
  ConfirmAdminPasswordResetBody,
  CreateGalleryBody,
  UpdateGalleryBody,
  UpdateGalleryParams,
  DeleteGalleryParams,
  DeleteContactSubmissionParams,
  DeleteEstimateRequestParams,
  ResendContactSubmissionNotificationParams,
  ResendContactSubmissionNotificationBody,
  ResendEstimateRequestNotificationParams,
  ResendEstimateRequestNotificationBody,
  AddGalleryImageBody,
  AddGalleryImageParams,
  UpdateGalleryImageBody,
  UpdateGalleryImageParams,
  DeleteGalleryImageParams,
  ReorderGalleryImagesBody,
  ReorderGalleryImagesParams,
  UpdateNotificationSettingsBody,
  SubscribeWebPushBody,
  UnsubscribeWebPushBody,
} from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getCurrentAdmin,
  requireAdmin,
  revokeOtherSessions,
  revokeAllSessions,
  getCurrentSessionId,
  createPasswordResetToken,
  consumePasswordResetToken,
  invalidateActiveResetTokens,
} from "../lib/auth";
import {
  loginLimiter,
  passwordResetRequestLimiter,
  passwordResetConfirmLimiter,
  testEmailLimiter,
  notificationRetryLimiter,
} from "../lib/rateLimit";
import { sendMail, getAdminNotificationEmail } from "../lib/mailer";
import { ObjectStorageService } from "../lib/objectStorage";
import {
  createBackfillJob,
  getBackfillJob,
  updateBackfillJob,
} from "../lib/backfillJobs";
import {
  resendContactNotification,
  resendEstimateNotification,
  sendTestNotificationEmail,
  sendTestNotificationSms,
  sendTestInAppNotification,
  sendTestNotificationPush,
  registerWebPushSubscription,
  unregisterWebPushSubscription,
  getWebPushPublicKey,
  isWebPushConfigured,
  type Channel,
} from "../lib/notify";
import { getInAppNotificationsCleanupStatus } from "../lib/inAppNotificationsCleanup";
import { getSpamBlockStats } from "../lib/spamBlockLog";

const objectStorageService = new ObjectStorageService();

const router: IRouter = Router();

function publicAdmin(user: { id: number; username: string; mustChangePassword: boolean; createdAt: Date }) {
  return {
    id: user.id,
    username: user.username,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
  };
}

function sameOriginGuard(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): void {
  const method = (req.method || "").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
  const host = req.get("host");
  const candidate = req.get("origin") || req.get("referer");
  if (!host || !candidate) {
    res.status(403).json({ error: "Cross-site request blocked" });
    return;
  }
  try {
    if (new URL(candidate).host !== host) {
      res.status(403).json({ error: "Cross-site request blocked" });
      return;
    }
  } catch {
    res.status(403).json({ error: "Cross-site request blocked" });
    return;
  }
  next();
}

router.post("/admin/login", sameOriginGuard, loginLimiter, async (req, res): Promise<void> => {
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

// Build the password-reset URL from a *trusted* server-side configuration only.
// We must never use the request's Host / X-Forwarded-Host headers here: those
// can be spoofed by an attacker triggering an unauthenticated reset request,
// which would cause the email to contain an attacker-controlled domain with a
// valid one-time token in the path (account takeover).
//
// Resolution order:
//  1. APP_BASE_URL (operator-configured canonical origin, e.g. https://vision9solar.com)
//  2. REPLIT_DOMAINS (Replit-injected; first entry, https) — safe in dev/preview
// If neither is set, we refuse to issue the link.
function getCanonicalBaseUrl(): string | null {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  const replitDomains = process.env.REPLIT_DOMAINS;
  if (replitDomains) {
    const first = replitDomains.split(",")[0].trim();
    if (first) return `https://${first}`;
  }
  return null;
}

router.post(
  "/admin/password-reset/request",
  sameOriginGuard,
  passwordResetRequestLimiter,
  async (req, res): Promise<void> => {
    const parsed = RequestAdminPasswordResetBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    // Verify reset is configured *before* doing the user lookup. Otherwise
    // unknown usernames would still get 204 while known usernames hit a 500,
    // which would leak username validity in the misconfigured-server case.
    const baseUrl = getCanonicalBaseUrl();
    if (!baseUrl) {
      req.log.error(
        "Cannot issue password reset: APP_BASE_URL is not configured and no safe fallback is available.",
      );
      res.status(500).json({
        error:
          "Password reset is not configured. Set APP_BASE_URL on the server and retry.",
      });
      return;
    }
    const username = parsed.data.username.trim();
    const [user] = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.username, username));
    if (!user) {
      // Do not reveal whether the username exists.
      req.log.info({ username }, "Password reset requested for unknown admin username");
      res.status(204).end();
      return;
    }
    // Invalidate any prior outstanding tokens before issuing a new one so
    // only one reset link is ever live for an account at a time.
    await invalidateActiveResetTokens(user.id);
    const { rawToken, expiresAt } = await createPasswordResetToken(user.id);
    const resetUrl = `${baseUrl}/admin/password-reset/${rawToken}`;
    const adminEmail = getAdminNotificationEmail();
    const text = [
      "A password reset was requested for your Vision9 Solar admin account.",
      "",
      `Reset link (valid for 15 minutes, until ${expiresAt.toUTCString()}):`,
      resetUrl,
      "",
      "If you did not request this, you can ignore this email — your password will not change.",
    ].join("\n");
    const html = `
      <p>A password reset was requested for your Vision9 Solar admin account.</p>
      <p><strong>This link is valid for 15 minutes</strong> (until ${expiresAt.toUTCString()}):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, you can ignore this email — your password will not change.</p>
    `;
    await sendMail({
      to: adminEmail,
      subject: "Vision9 Solar admin password reset",
      text,
      html,
    });
    req.log.info({ adminUserId: user.id }, "Issued admin password reset token");
    res.status(204).end();
  },
);

router.post(
  "/admin/password-reset/confirm",
  sameOriginGuard,
  passwordResetConfirmLimiter,
  async (req, res): Promise<void> => {
    const parsed = ConfirmAdminPasswordResetBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const consumed = await consumePasswordResetToken(parsed.data.token);
    if (!consumed) {
      res.status(400).json({ error: "Invalid or expired reset link" });
      return;
    }
    const newHash = await hashPassword(parsed.data.newPassword);
    await db
      .update(adminUsersTable)
      .set({ passwordHash: newHash, mustChangePassword: false })
      .where(eq(adminUsersTable.id, consumed.userId));
    await invalidateActiveResetTokens(consumed.userId);
    await revokeAllSessions(consumed.userId);
    req.log.info({ adminUserId: consumed.userId }, "Admin password reset via token");
    res.status(204).end();
  },
);

router.post("/admin/logout", sameOriginGuard, async (req, res): Promise<void> => {
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

router.get("/admin/spam-block-stats", requireAdmin, async (_req, res): Promise<void> => {
  const stats = await getSpamBlockStats();
  res.json(stats);
});

router.get("/admin/contact-submissions", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(contactSubmissionsTable)
    .orderBy(desc(contactSubmissionsTable.createdAt));
  res.json(rows);
});

router.post(
  "/admin/contact-submissions/:id/resend-notification",
  sameOriginGuard,
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = ResendContactSubmissionNotificationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = ResendContactSubmissionNotificationBody.safeParse(req.body ?? {});
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [row] = await db
      .select()
      .from(contactSubmissionsTable)
      .where(eq(contactSubmissionsTable.id, params.data.id));
    if (!row) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }
    const channels = (body.data.channels ?? ["email", "sms"]) as Channel[];
    await resendContactNotification(
      row.id,
      { name: row.name, email: row.email, phone: row.phone, message: row.message },
      channels,
    );
    const [updated] = await db
      .select()
      .from(contactSubmissionsTable)
      .where(eq(contactSubmissionsTable.id, params.data.id));
    res.json(updated);
  },
);

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

router.post(
  "/admin/estimate-requests/:id/resend-notification",
  sameOriginGuard,
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = ResendEstimateRequestNotificationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = ResendEstimateRequestNotificationBody.safeParse(req.body ?? {});
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [row] = await db
      .select()
      .from(estimateRequestsTable)
      .where(eq(estimateRequestsTable.id, params.data.id));
    if (!row) {
      res.status(404).json({ error: "Estimate request not found" });
      return;
    }
    const channels = (body.data.channels ?? ["email", "sms"]) as Channel[];
    const { id: _id, createdAt: _createdAt, emailStatus: _es, emailError: _ee, emailSentAt: _esa,
      emailAttempts: _ea, emailNextRetryAt: _enra,
      smsStatus: _ss, smsError: _se, smsSentAt: _ssa,
      smsAttempts: _sa, smsNextRetryAt: _snra, ...estimateData } = row;
    await resendEstimateNotification(row.id, estimateData as Record<string, unknown>, channels);
    const [updated] = await db
      .select()
      .from(estimateRequestsTable)
      .where(eq(estimateRequestsTable.id, params.data.id));
    res.json(updated);
  },
);

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

// Admin-only: replace the sort_order of every image in a gallery in one
// transaction. Caller sends the full list of image ids in the desired new
// order; the handler verifies every id belongs to the gallery and that the
// list exactly matches the gallery's current image set (no adds/removes here
// — use POST/DELETE for that), then writes sort_order = index for each row.
router.post("/admin/galleries/:id/reorder", requireAdmin, async (req, res): Promise<void> => {
  const params = ReorderGalleryImagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ReorderGalleryImagesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const galleryId = params.data.id;
  const requestedIds = parsed.data.imageIds;

  const [gallery] = await db
    .select({ id: galleriesTable.id })
    .from(galleriesTable)
    .where(eq(galleriesTable.id, galleryId));
  if (!gallery) {
    res.status(404).json({ error: "Gallery not found" });
    return;
  }

  if (new Set(requestedIds).size !== requestedIds.length) {
    res.status(400).json({ error: "Duplicate image ids in reorder payload" });
    return;
  }

  const rows = await db
    .select({ id: galleryImagesTable.id })
    .from(galleryImagesTable)
    .where(eq(galleryImagesTable.galleryId, galleryId));
  const existingIds = new Set(rows.map((r) => r.id));
  if (existingIds.size !== requestedIds.length) {
    res.status(400).json({
      error: `Reorder payload has ${requestedIds.length} ids but gallery has ${existingIds.size} images`,
    });
    return;
  }
  for (const id of requestedIds) {
    if (!existingIds.has(id)) {
      res.status(400).json({ error: `Image ${id} does not belong to gallery ${galleryId}` });
      return;
    }
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < requestedIds.length; i += 1) {
      await tx
        .update(galleryImagesTable)
        .set({ sortOrder: i })
        .where(
          and(
            eq(galleryImagesTable.id, requestedIds[i]),
            eq(galleryImagesTable.galleryId, galleryId),
          ),
        );
    }
  });

  const updated = await db
    .select()
    .from(galleryImagesTable)
    .where(eq(galleryImagesTable.galleryId, galleryId))
    .orderBy(asc(galleryImagesTable.sortOrder));
  res.json(updated);
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
  // Generate downscaled WebP variants synchronously so that the gallery's
  // <img srcset> never points at variants that don't exist yet. A failure
  // here is non-fatal: the original is still usable, the row already exists,
  // and the admin can re-run backfill later.
  try {
    await objectStorageService.generateImageVariants(parsed.data.objectPath);
  } catch (err) {
    req.log.error(
      { err, objectPath: parsed.data.objectPath },
      "Failed to generate image variants",
    );
  }
  res.status(201).json(row);
});

// Admin-only: report how many gallery images are missing thumb/medium WebP
// variants so admins can decide whether a backfill is needed.
router.get("/admin/storage/image-variants-status", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(galleryImagesTable);
  // Run existence checks with bounded concurrency so galleries with hundreds
  // of images don't take seconds of sequential HEAD requests against object
  // storage. 16 in flight is well within GCS's per-connection limits and
  // keeps p99 latency low for the admin status panel.
  const CONCURRENCY = 16;
  let missingThumb = 0;
  let missingMedium = 0;
  let cursor = 0;
  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= rows.length) return;
      const status = await objectStorageService.checkImageVariants(rows[i].objectPath);
      if (!status.thumb) missingThumb += 1;
      if (!status.medium) missingMedium += 1;
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, rows.length) }, () => worker()),
  );
  res.json({ totalImages: rows.length, missingThumb, missingMedium });
});

// Admin-only: list every gallery image that is missing one or more WebP
// variants, including which variants are missing and which gallery owns the
// image. Powers the admin drill-down so admins can see exactly which uploads
// are stuck without forcing a full backfill.
router.get(
  "/admin/storage/image-variants-status/missing",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        id: galleryImagesTable.id,
        galleryId: galleryImagesTable.galleryId,
        objectPath: galleryImagesTable.objectPath,
        caption: galleryImagesTable.caption,
        altText: galleryImagesTable.altText,
        galleryTitle: galleriesTable.title,
        gallerySlug: galleriesTable.slug,
      })
      .from(galleryImagesTable)
      .innerJoin(galleriesTable, eq(galleriesTable.id, galleryImagesTable.galleryId))
      .orderBy(asc(galleriesTable.title), asc(galleryImagesTable.sortOrder));
    const missing: Array<{
      id: number;
      galleryId: number;
      galleryTitle: string;
      gallerySlug: string;
      objectPath: string;
      caption: string | null;
      altText: string | null;
      missingVariants: Array<"thumb" | "medium">;
    }> = [];
    for (const row of rows) {
      const status = await objectStorageService.checkImageVariants(row.objectPath);
      const missingVariants: Array<"thumb" | "medium"> = [];
      if (!status.thumb) missingVariants.push("thumb");
      if (!status.medium) missingVariants.push("medium");
      if (missingVariants.length === 0) continue;
      missing.push({
        id: row.id,
        galleryId: row.galleryId,
        galleryTitle: row.galleryTitle,
        gallerySlug: row.gallerySlug,
        objectPath: row.objectPath,
        caption: row.caption,
        altText: row.altText,
        missingVariants,
      });
    }
    res.json(missing);
  },
);

// Admin-only: regenerate WebP variants for a single gallery image. Lets
// admins fix one stuck upload without re-running the full backfill.
router.post(
  "/admin/gallery-images/:id/regenerate-variants",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = DeleteGalleryImageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const force = req.query.force === "1" || req.query.force === "true";
    const [row] = await db
      .select()
      .from(galleryImagesTable)
      .where(eq(galleryImagesTable.id, params.data.id));
    if (!row) {
      res.status(404).json({ error: "Image not found" });
      return;
    }
    try {
      const generated = await objectStorageService.generateImageVariants(row.objectPath, {
        force,
      });
      res.json({ id: row.id, objectPath: row.objectPath, generated });
    } catch (err) {
      req.log.error({ err, objectPath: row.objectPath }, "Regenerate variants failed");
      res.status(500).json({ error: "Failed to regenerate variants" });
    }
  },
);

// Admin-only: kick off a background job to backfill thumb/medium WebP variants
// for every gallery image. Returns immediately with a job id; clients poll
// GET /admin/storage/backfill-image-variants/jobs/:id for progress.
// Idempotent — already-present variants are skipped unless ?force=1 is set.
router.post("/admin/storage/backfill-image-variants", requireAdmin, async (req, res): Promise<void> => {
  const force = req.query.force === "1" || req.query.force === "true";
  const job = createBackfillJob(force);
  const log = req.log;

  // Run the rebuild detached from the request lifecycle. We intentionally do
  // not await — the response is returned immediately.
  void (async () => {
    try {
      const rows = await db.select().from(galleryImagesTable);
      updateBackfillJob(job.id, { state: "running", total: rows.length });
      for (const row of rows) {
        try {
          const v = await objectStorageService.generateImageVariants(row.objectPath, { force });
          const current = getBackfillJob(job.id);
          if (!current) return;
          updateBackfillJob(job.id, {
            processed: current.processed + 1,
            generated: current.generated + v.length,
          });
        } catch (err) {
          const current = getBackfillJob(job.id);
          if (!current) return;
          updateBackfillJob(job.id, {
            processed: current.processed + 1,
            failed: current.failed + 1,
          });
          log.error({ err, objectPath: row.objectPath }, "Backfill failed for image");
        }
      }
      updateBackfillJob(job.id, {
        state: "completed",
        finishedAt: new Date().toISOString(),
      });
    } catch (err) {
      log.error({ err, jobId: job.id }, "Backfill job crashed");
      updateBackfillJob(job.id, {
        state: "failed",
        finishedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();

  res.status(202).json({
    jobId: job.id,
    state: job.state,
    total: job.total,
    processed: job.processed,
    generated: job.generated,
    failed: job.failed,
  });
});

router.get(
  "/admin/storage/backfill-image-variants/jobs/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = String(req.params.id ?? "");
    const job = getBackfillJob(id);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json({
      jobId: job.id,
      state: job.state,
      total: job.total,
      processed: job.processed,
      generated: job.generated,
      failed: job.failed,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      error: job.error,
    });
  },
);

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

const FALLBACK_NOTIFY_TO = process.env["NOTIFY_EMAIL_TO"] ?? "info@vision9.biz";

const FALLBACK_SMS_RECIPIENTS = (() => {
  const raw = process.env["NOTIFY_SMS_TO"]?.trim();
  return raw ? [raw] : [];
})();

router.get("/admin/notification-settings", requireAdmin, async (_req, res): Promise<void> => {
  const [row] = await db.select().from(notificationSettingsTable).limit(1);
  if (!row) {
    res.json({
      recipients: [FALLBACK_NOTIFY_TO],
      smsRecipients: FALLBACK_SMS_RECIPIENTS,
      updatedAt: new Date().toISOString(),
    });
    return;
  }
  const smsRecipients =
    row.smsRecipients && row.smsRecipients.length > 0
      ? row.smsRecipients
      : FALLBACK_SMS_RECIPIENTS;
  res.json({
    recipients: row.recipients,
    smsRecipients,
    updatedAt: row.updatedAt,
  });
});

router.put("/admin/notification-settings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateNotificationSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const recipients = Array.from(
    new Set(parsed.data.recipients.map((r) => r.trim().toLowerCase()).filter((r) => r.length > 0)),
  );
  const smsRecipients = Array.from(
    new Set(
      (parsed.data.smsRecipients ?? [])
        .map((r) => (typeof r === "string" ? r.trim() : ""))
        .filter((r) => r.length > 0),
    ),
  );
  const [existing] = await db.select().from(notificationSettingsTable).limit(1);
  let row;
  if (existing) {
    [row] = await db
      .update(notificationSettingsTable)
      .set({ recipients, smsRecipients })
      .where(eq(notificationSettingsTable.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(notificationSettingsTable)
      .values({ id: 1, recipients, smsRecipients })
      .returning();
  }
  res.json({
    recipients: row!.recipients,
    smsRecipients: row!.smsRecipients,
    updatedAt: row!.updatedAt,
  });
});

router.post(
  "/admin/notification-settings/test",
  requireAdmin,
  testEmailLimiter,
  async (_req, res): Promise<void> => {
    const result = await sendTestNotificationEmail();
    res.json(result);
  },
);

router.post(
  "/admin/notification-settings/test-sms",
  requireAdmin,
  async (req, res): Promise<void> => {
    const body = (req.body ?? {}) as { recipient?: unknown };
    const rawRecipient = typeof body.recipient === "string" ? body.recipient.trim() : "";
    if (rawRecipient && !/^\+[1-9]\d{1,14}$/.test(rawRecipient)) {
      res.status(400).json({ error: "recipient must be in E.164 format (e.g. +15551234567)" });
      return;
    }
    const result = await sendTestNotificationSms(rawRecipient || null);
    res.json(result);
  },
);

router.get("/admin/notification-log", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(notificationLogTable)
    .orderBy(desc(notificationLogTable.createdAt))
    .limit(50);
  res.json(
    rows.map((r) => ({
      id: r.id,
      channel: r.channel,
      recipients: r.recipients,
      subject: r.subject,
      relatedKind: r.relatedKind,
      relatedId: r.relatedId,
      status: r.status,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt,
    })),
  );
});

router.post(
  "/admin/notification-settings/test-in-app",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const result = await sendTestInAppNotification();
    res.json(result);
  },
);

router.get(
  "/admin/notification-settings/push/public-key",
  requireAdmin,
  async (_req, res): Promise<void> => {
    res.json({
      publicKey: getWebPushPublicKey(),
      configured: isWebPushConfigured(),
    });
  },
);

router.post(
  "/admin/notification-settings/push/subscribe",
  sameOriginGuard,
  requireAdmin,
  async (req, res): Promise<void> => {
    if (!isWebPushConfigured()) {
      res.status(503).json({
        error:
          "Web push is not configured on the server. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (and optionally VAPID_SUBJECT) and restart.",
      });
      return;
    }
    const parsed = SubscribeWebPushBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    try {
      await registerWebPushSubscription({
        endpoint: parsed.data.endpoint,
        keys: parsed.data.keys,
        userAgent: parsed.data.userAgent ?? null,
      });
    } catch (err) {
      req.log.error({ err }, "Failed to register web push subscription");
      res.status(500).json({ error: "Failed to register subscription" });
      return;
    }
    res.status(204).end();
  },
);

router.post(
  "/admin/notification-settings/push/unsubscribe",
  sameOriginGuard,
  requireAdmin,
  async (req, res): Promise<void> => {
    const parsed = UnsubscribeWebPushBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    try {
      await unregisterWebPushSubscription(parsed.data.endpoint);
    } catch (err) {
      req.log.error({ err }, "Failed to unregister web push subscription");
      res.status(500).json({ error: "Failed to remove subscription" });
      return;
    }
    res.status(204).end();
  },
);

router.post(
  "/admin/notification-settings/test-push",
  sameOriginGuard,
  requireAdmin,
  async (_req, res): Promise<void> => {
    const result = await sendTestNotificationPush();
    res.json(result);
  },
);

router.get("/admin/in-app-notifications", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(inAppNotificationsTable)
    .orderBy(desc(inAppNotificationsTable.createdAt))
    .limit(50);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inAppNotificationsTable)
    .where(isNull(inAppNotificationsTable.readAt));
  res.json({ items: rows, unreadCount: Number(count) });
});

router.get(
  "/admin/in-app-notifications/cleanup-status",
  requireAdmin,
  async (_req, res): Promise<void> => {
    res.json(getInAppNotificationsCleanupStatus());
  },
);

router.post(
  "/admin/in-app-notifications/mark-all-read",
  requireAdmin,
  async (_req, res): Promise<void> => {
    await db
      .update(inAppNotificationsTable)
      .set({ readAt: new Date() })
      .where(isNull(inAppNotificationsTable.readAt));
    res.status(204).end();
  },
);

router.post(
  "/admin/notification-log/:id/retry",
  sameOriginGuard,
  requireAdmin,
  notificationRetryLimiter,
  async (req, res): Promise<void> => {
    const idParam = Number(req.params["id"]);
    if (!Number.isInteger(idParam) || idParam <= 0) {
      res.status(400).json({ error: "Invalid log entry id" });
      return;
    }
    const [entry] = await db
      .select()
      .from(notificationLogTable)
      .where(eq(notificationLogTable.id, idParam));
    if (!entry) {
      res.status(404).json({ error: "Log entry not found" });
      return;
    }
    if (entry.channel !== "email" && entry.channel !== "sms") {
      res.status(400).json({ error: "Unsupported channel" });
      return;
    }
    if (!entry.relatedKind || !entry.relatedId) {
      res.status(400).json({ error: "This entry has no related lead to resend" });
      return;
    }
    const channels: Channel[] = [entry.channel];
    if (entry.relatedKind === "contact") {
      const [row] = await db
        .select()
        .from(contactSubmissionsTable)
        .where(eq(contactSubmissionsTable.id, entry.relatedId));
      if (!row) {
        res.status(404).json({ error: "Original contact submission no longer exists" });
        return;
      }
      await resendContactNotification(
        row.id,
        { name: row.name, email: row.email, phone: row.phone, message: row.message },
        channels,
      );
    } else if (entry.relatedKind === "estimate") {
      const [row] = await db
        .select()
        .from(estimateRequestsTable)
        .where(eq(estimateRequestsTable.id, entry.relatedId));
      if (!row) {
        res.status(404).json({ error: "Original estimate request no longer exists" });
        return;
      }
      const { id: _id, createdAt: _createdAt, emailStatus: _es, emailError: _ee,
        emailSentAt: _esa, smsStatus: _ss, smsError: _se, smsSentAt: _ssa, ...estimateData } = row;
      await resendEstimateNotification(row.id, estimateData as Record<string, unknown>, channels);
    } else {
      res.status(400).json({ error: "This kind of entry cannot be retried" });
      return;
    }
    const [latest] = await db
      .select()
      .from(notificationLogTable)
      .where(
        and(
          eq(notificationLogTable.relatedKind, entry.relatedKind),
          eq(notificationLogTable.relatedId, entry.relatedId),
          eq(notificationLogTable.channel, entry.channel),
        ),
      )
      .orderBy(desc(notificationLogTable.createdAt))
      .limit(1);
    if (!latest) {
      res.status(500).json({ error: "Retry attempt did not produce a log entry" });
      return;
    }
    res.json({
      id: latest.id,
      channel: latest.channel,
      recipients: latest.recipients,
      subject: latest.subject,
      relatedKind: latest.relatedKind,
      relatedId: latest.relatedId,
      status: latest.status,
      errorMessage: latest.errorMessage,
      createdAt: latest.createdAt,
    });
  },
);
export default router;
