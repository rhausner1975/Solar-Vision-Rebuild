import { Router, type IRouter, type Request } from "express";
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
import { verifyTurnstileToken } from "../lib/turnstile";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const MIN_FILL_TIME_MS = 2000;

interface AntiSpamFields {
  turnstileToken?: unknown;
  website?: unknown;
  formMountedAt?: unknown;
}

interface AntiSpamResult {
  silentDrop: boolean;
  rejectReason?: string;
}

/**
 * Pre-checks honeypot field and minimum fill time. Both are intentionally
 * silent: bots get a fake-success response so they don't learn what triggered
 * the rejection. The third defense (Turnstile) returns a real 400 because it's
 * a visible challenge for legitimate users.
 */
function checkHoneypotAndTiming(req: Request, formName: string): AntiSpamResult {
  const body = (req.body ?? {}) as AntiSpamFields;

  // Honeypot: a hidden field real users never see and never fill.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    logger.info(
      { form: formName, ip: req.ip, honeypot: body.website },
      "Spam blocked: honeypot field filled",
    );
    return { silentDrop: true, rejectReason: "honeypot" };
  }

  // Minimum fill time: humans cannot complete the form faster than this.
  if (typeof body.formMountedAt === "number" && Number.isFinite(body.formMountedAt)) {
    const elapsed = Date.now() - body.formMountedAt;
    if (elapsed >= 0 && elapsed < MIN_FILL_TIME_MS) {
      logger.info(
        { form: formName, ip: req.ip, elapsedMs: elapsed },
        "Spam blocked: form submitted too quickly",
      );
      return { silentDrop: true, rejectReason: "too-fast" };
    }
  }

  return { silentDrop: false };
}

router.post("/contact-submissions", publicFormLimiter, async (req, res): Promise<void> => {
  const antiSpam = checkHoneypotAndTiming(req, "contact");
  if (antiSpam.silentDrop) {
    res.status(201).json({ id: 0, ok: true });
    return;
  }

  const token = (req.body as AntiSpamFields)?.turnstileToken;
  const captcha = await verifyTurnstileToken(
    typeof token === "string" ? token : undefined,
    req.ip,
  );
  if (!captcha.ok) {
    logger.info(
      { form: "contact", ip: req.ip, reason: captcha.reason },
      "Spam blocked: captcha verification failed",
    );
    res.status(400).json({ error: "Captcha verification failed. Please try again." });
    return;
  }

  const parsed = CreateContactSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(contactSubmissionsTable)
    .values(parsed.data)
    .returning({ id: contactSubmissionsTable.id });
  notifyContactSubmission(row.id, parsed.data);
  res.status(201).json({ id: row.id, ok: true });
});

router.post("/estimate-requests", publicFormLimiter, async (req, res): Promise<void> => {
  const antiSpam = checkHoneypotAndTiming(req, "estimate");
  if (antiSpam.silentDrop) {
    res.status(201).json({ id: 0, ok: true });
    return;
  }

  const token = (req.body as AntiSpamFields)?.turnstileToken;
  const captcha = await verifyTurnstileToken(
    typeof token === "string" ? token : undefined,
    req.ip,
  );
  if (!captcha.ok) {
    logger.info(
      { form: "estimate", ip: req.ip, reason: captcha.reason },
      "Spam blocked: captcha verification failed",
    );
    res.status(400).json({ error: "Captcha verification failed. Please try again." });
    return;
  }

  const parsed = CreateEstimateRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(estimateRequestsTable)
    .values(parsed.data)
    .returning({ id: estimateRequestsTable.id });
  notifyEstimateRequest(row.id, parsed.data as Record<string, unknown>);
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
