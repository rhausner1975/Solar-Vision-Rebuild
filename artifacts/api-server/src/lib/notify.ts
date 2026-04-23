import { ReplitConnectors } from "@replit/connectors-sdk";
import { eq } from "drizzle-orm";
import webpush from "web-push";
import {
  db,
  contactSubmissionsTable,
  estimateRequestsTable,
  notificationSettingsTable,
  notificationLogTable,
  inAppNotificationsTable,
  webPushSubscriptionsTable,
} from "@workspace/db";
import { NOTIFICATION_MAX_ATTEMPTS } from "@workspace/api-zod";
import { logger } from "./logger";

const FALLBACK_TO = process.env["NOTIFY_EMAIL_TO"] ?? "info@vision9.biz";

const FALLBACK_SMS_TO = process.env["NOTIFY_SMS_TO"];
const TWILIO_ACCOUNT_SID = process.env["TWILIO_ACCOUNT_SID"];
const TWILIO_AUTH_TOKEN = process.env["TWILIO_AUTH_TOKEN"];
const TWILIO_FROM_NUMBER = process.env["TWILIO_FROM_NUMBER"];
const SMS_MAX_LENGTH = 320;

const connectors = new ReplitConnectors();

export type DeliveryStatus = "sent" | "failed" | "skipped";
export type NotifyKind = "contact" | "estimate";
export type Channel = "email" | "sms";

export interface DeliveryOutcome {
  status: DeliveryStatus;
  error?: string;
  sentAt?: Date;
  permanent?: boolean;
}

export const MAX_NOTIFICATION_ATTEMPTS = NOTIFICATION_MAX_ATTEMPTS;
const RETRY_DELAYS_MS = [3 * 60_000, 12 * 60_000];

function nextRetryDelayMs(attemptsCompleted: number): number | null {
  if (attemptsCompleted >= MAX_NOTIFICATION_ATTEMPTS) return null;
  const idx = Math.max(0, attemptsCompleted - 1);
  return RETRY_DELAYS_MS[idx] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1] ?? null;
}

function isTransientHttpStatus(status: number): boolean {
  if (status === 408 || status === 429) return true;
  return status >= 500 && status < 600;
}

interface RelatedRef {
  kind: "contact" | "estimate" | "test";
  id?: number | null;
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 200);
}

function buildRfc822(to: string, subject: string, body: string): string {
  const lines = [
    `To: ${sanitizeHeader(to)}`,
    `Subject: ${sanitizeHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    body,
  ];
  return lines.join("\r\n");
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getRecipients(): Promise<string[]> {
  try {
    const [row] = await db.select().from(notificationSettingsTable).limit(1);
    const recipients = row?.recipients ?? [];
    if (recipients.length > 0) return recipients;
  } catch (err) {
    logger.error({ err }, "Failed to load notification recipients from database");
  }
  return [FALLBACK_TO];
}

async function recordAttempt(params: {
  channel: "email" | "sms";
  recipients: string[];
  subject: string | null;
  related: RelatedRef;
  status: "success" | "failed";
  errorMessage: string | null;
}): Promise<void> {
  try {
    await db.insert(notificationLogTable).values({
      channel: params.channel,
      recipients: params.recipients,
      subject: params.subject,
      relatedKind: params.related.kind,
      relatedId: params.related.id ?? null,
      status: params.status,
      errorMessage: params.errorMessage,
    });
  } catch (err) {
    logger.error({ err }, "Failed to record notification log entry");
  }
}

async function getSmsRecipients(): Promise<string[]> {
  try {
    const [row] = await db.select().from(notificationSettingsTable).limit(1);
    const saved = (row?.smsRecipients ?? [])
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter((s) => s.length > 0);
    if (saved.length > 0) return Array.from(new Set(saved));
  } catch (err) {
    logger.error({ err }, "Failed to load SMS recipients from database");
  }
  const fallback = FALLBACK_SMS_TO?.trim();
  return fallback ? [fallback] : [];
}

async function deliverEmail(
  subject: string,
  body: string,
  related: RelatedRef,
  overrideRecipients?: string[],
): Promise<DeliveryOutcome> {
  const recipients =
    overrideRecipients && overrideRecipients.length > 0
      ? overrideRecipients
      : await getRecipients();
  try {
    const toHeader = recipients.join(", ");
    const raw = base64UrlEncode(buildRfc822(toHeader, subject, body));
    const response = await connectors.proxy(
      "google-mail",
      "/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      },
    );
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const error = `Gmail ${response.status}: ${text.slice(0, 500)}`;
      await recordAttempt({
        channel: "email",
        recipients,
        subject,
        related,
        status: "failed",
        errorMessage: error.slice(0, 2000),
      });
      return {
        status: "failed",
        error,
        permanent: !isTransientHttpStatus(response.status),
      };
    }
    await recordAttempt({
      channel: "email",
      recipients,
      subject,
      related,
      status: "success",
      errorMessage: null,
    });
    return { status: "sent", sentAt: new Date() };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await recordAttempt({
      channel: "email",
      recipients,
      subject,
      related,
      status: "failed",
      errorMessage: error.slice(0, 2000),
    });
    return { status: "failed", error };
  }
}

export async function sendTestNotificationEmail(): Promise<{
  delivered: boolean;
  recipients: string[];
  error?: string;
}> {
  const recipients = await getRecipients();
  const subject = "[TEST] Vision9 Solar notification test";
  const body = [
    "This is a test notification from the Vision9 Solar admin panel.",
    "",
    "If you received this email, your notification recipient list is configured correctly",
    "and you will be alerted when new contact submissions or estimate requests come in.",
    "",
    `Recipients on this test: ${recipients.join(", ")}`,
    `Sent at: ${new Date().toISOString()}`,
  ].join("\n");
  const outcome = await deliverEmail(subject, body, { kind: "test", id: null }, recipients);
  if (outcome.status === "sent") {
    logger.info({ recipients }, "Sent test notification email");
    return { delivered: true, recipients };
  }
  logger.error(
    { error: outcome.error, recipients },
    "Failed to send test notification email",
  );
  return { delivered: false, recipients, error: outcome.error ?? "Unknown error" };
}

function smsTwilioConfigured(): boolean {
  return Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER);
}

function smsConfigError(hasRecipients: boolean): string {
  const missing = [
    !hasRecipients && "at least one phone number saved in Notification Settings (or NOTIFY_SMS_TO)",
    !TWILIO_ACCOUNT_SID && "TWILIO_ACCOUNT_SID",
    !TWILIO_AUTH_TOKEN && "TWILIO_AUTH_TOKEN",
    !TWILIO_FROM_NUMBER && "TWILIO_FROM_NUMBER",
  ].filter(Boolean);
  return `SMS not configured. Missing: ${missing.join(", ")}`;
}

async function sendSmsToRecipient(
  recipient: string,
  message: string,
  related: RelatedRef,
): Promise<DeliveryOutcome> {
  if (!smsTwilioConfigured()) {
    return { status: "skipped", error: smsConfigError(true), permanent: true };
  }
  const truncated =
    message.length > SMS_MAX_LENGTH ? `${message.slice(0, SMS_MAX_LENGTH - 1)}…` : message;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
    TWILIO_ACCOUNT_SID!,
  )}/Messages.json`;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const body = new URLSearchParams({
    To: recipient,
    From: TWILIO_FROM_NUMBER!,
    Body: truncated,
  });
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const error = `Twilio ${response.status}: ${text.slice(0, 500)}`;
      await recordAttempt({
        channel: "sms",
        recipients: [recipient],
        subject: null,
        related,
        status: "failed",
        errorMessage: error.slice(0, 2000),
      });
      return {
        status: "failed",
        error,
        permanent: !isTransientHttpStatus(response.status),
      };
    }
    await recordAttempt({
      channel: "sms",
      recipients: [recipient],
      subject: null,
      related,
      status: "success",
      errorMessage: null,
    });
    return { status: "sent", sentAt: new Date() };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await recordAttempt({
      channel: "sms",
      recipients: [recipient],
      subject: null,
      related,
      status: "failed",
      errorMessage: error.slice(0, 2000),
    });
    return { status: "failed", error };
  }
}

async function sendSms(
  message: string,
  related: RelatedRef,
  overrideRecipients?: string[],
): Promise<DeliveryOutcome> {
  const recipients =
    overrideRecipients && overrideRecipients.length > 0
      ? overrideRecipients
      : await getSmsRecipients();
  if (recipients.length === 0 || !smsTwilioConfigured()) {
    return {
      status: "skipped",
      error: smsConfigError(recipients.length > 0),
      permanent: true,
    };
  }
  const outcomes = await Promise.all(
    recipients.map((r) => sendSmsToRecipient(r, message, related)),
  );
  const anySent = outcomes.some((o) => o.status === "sent");
  const anyFailed = outcomes.some((o) => o.status === "failed");
  if (anySent && !anyFailed) {
    return { status: "sent", sentAt: new Date() };
  }
  if (anySent && anyFailed) {
    const failed = outcomes
      .map((o, i) => (o.status === "failed" ? `${recipients[i]}: ${o.error ?? "failed"}` : null))
      .filter(Boolean)
      .join("; ");
    return {
      status: "sent",
      sentAt: new Date(),
      error: `Partial delivery — failed: ${failed}`,
    };
  }
  const errors = outcomes
    .map((o, i) => `${recipients[i]}: ${o.error ?? o.status}`)
    .join("; ");
  // Mark permanent only if every failed outcome is itself permanent (i.e. retry will not help).
  const allPermanent = outcomes
    .filter((o) => o.status === "failed")
    .every((o) => o.permanent === true);
  return {
    status: "failed",
    error: errors,
    permanent: outcomes.some((o) => o.status === "failed") ? allPermanent : false,
  };
}

export async function sendTestNotificationSms(targetRecipient?: string | null): Promise<{
  delivered: boolean;
  configured: boolean;
  recipients: string[];
  results: { recipient: string; delivered: boolean; error?: string | null }[];
  error?: string;
}> {
  const saved = await getSmsRecipients();
  let recipients: string[];
  if (targetRecipient) {
    const trimmed = targetRecipient.trim();
    if (!saved.includes(trimmed)) {
      return {
        delivered: false,
        configured: smsTwilioConfigured(),
        recipients: [],
        results: [],
        error: `Phone number ${trimmed} is not in the saved SMS recipients. Save it first.`,
      };
    }
    recipients = [trimmed];
  } else {
    recipients = saved;
  }
  if (recipients.length === 0 || !smsTwilioConfigured()) {
    const error = smsConfigError(recipients.length > 0);
    logger.warn({ error }, "Test SMS skipped: not configured");
    return {
      delivered: false,
      configured: smsTwilioConfigured(),
      recipients,
      results: [],
      error,
    };
  }
  const message = `[TEST] Vision9 Solar SMS alert test sent at ${new Date().toISOString()}. If you received this, lead alerts to this number are working.`;
  const outcomes = await Promise.all(
    recipients.map(async (r) => ({
      recipient: r,
      outcome: await sendSmsToRecipient(r, message, { kind: "test", id: null }),
    })),
  );
  const results = outcomes.map(({ recipient, outcome }) => ({
    recipient,
    delivered: outcome.status === "sent",
    error: outcome.error ?? null,
  }));
  const anyDelivered = results.some((r) => r.delivered);
  const anyFailed = results.some((r) => !r.delivered);
  if (anyDelivered) {
    logger.info({ recipients }, "Sent test notification SMS");
  } else {
    logger.error({ results }, "Failed to send test notification SMS to all recipients");
  }
  return {
    delivered: anyDelivered && !anyFailed,
    configured: true,
    recipients,
    results,
    error: anyFailed
      ? results
          .filter((r) => !r.delivered)
          .map((r) => `${r.recipient}: ${r.error ?? "failed"}`)
          .join("; ")
      : undefined,
  };
}

async function recordInAppNotification(
  kind: string,
  title: string,
  body: string,
): Promise<DeliveryOutcome> {
  try {
    await db.insert(inAppNotificationsTable).values({ kind, title, body });
    return { status: "sent", sentAt: new Date() };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendTestInAppNotification(): Promise<{
  delivered: boolean;
  error?: string;
}> {
  const outcome = await recordInAppNotification(
    "test",
    "Test in-app alert",
    `This is a test in-app notification sent at ${new Date().toISOString()}. ` +
      "If you can see this in the admin notifications bell, in-app alerts are working.",
  );
  if (outcome.status === "sent") {
    logger.info("Created test in-app notification");
    return { delivered: true };
  }
  logger.error({ error: outcome.error }, "Failed to create test in-app notification");
  return { delivered: false, error: outcome.error ?? "Unknown error" };
}

function dispatchInApp(kind: string, title: string, body: string, context: string): void {
  recordInAppNotification(kind, title, body).then((outcome) => {
    if (outcome.status !== "sent") {
      logger.error(
        { error: outcome.error, context },
        "Failed to record in-app notification",
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Web push
// ---------------------------------------------------------------------------

const VAPID_PUBLIC_KEY = process.env["VAPID_PUBLIC_KEY"]?.trim() || null;
const VAPID_PRIVATE_KEY = process.env["VAPID_PRIVATE_KEY"]?.trim() || null;
const VAPID_SUBJECT =
  process.env["VAPID_SUBJECT"]?.trim() || "mailto:info@vision9.biz";

let vapidConfigured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
  } catch (err) {
    logger.error({ err }, "Failed to configure VAPID details for web push");
  }
}

export function isWebPushConfigured(): boolean {
  return vapidConfigured;
}

export function getWebPushPublicKey(): string | null {
  return vapidConfigured ? VAPID_PUBLIC_KEY : null;
}

export interface WebPushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string | null;
}

export async function registerWebPushSubscription(
  sub: WebPushSubscriptionPayload,
): Promise<void> {
  await db
    .insert(webPushSubscriptionsTable)
    .values({
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent: sub.userAgent ?? null,
      disabledAt: null,
      lastError: null,
      lastErrorAt: null,
    })
    .onConflictDoUpdate({
      target: webPushSubscriptionsTable.endpoint,
      set: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent: sub.userAgent ?? null,
        disabledAt: null,
        lastError: null,
        lastErrorAt: null,
      },
    });
}

export async function unregisterWebPushSubscription(endpoint: string): Promise<void> {
  await db
    .delete(webPushSubscriptionsTable)
    .where(eq(webPushSubscriptionsTable.endpoint, endpoint));
}

export async function countActiveWebPushSubscriptions(): Promise<number> {
  const rows = await db.select().from(webPushSubscriptionsTable);
  return rows.filter((r) => r.disabledAt === null).length;
}

interface PushPayload {
  kind: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface PushSendSummary {
  configured: boolean;
  subscriptions: number;
  sent: number;
  failed: number;
  error?: string;
}

async function sendWebPushToAll(payload: PushPayload): Promise<PushSendSummary> {
  if (!vapidConfigured) {
    return {
      configured: false,
      subscriptions: 0,
      sent: 0,
      failed: 0,
      error:
        "Web push is not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (and optionally VAPID_SUBJECT) on the server.",
    };
  }
  const subs = await db.select().from(webPushSubscriptionsTable);
  const active = subs.filter((s) => s.disabledAt === null);
  if (active.length === 0) {
    return { configured: true, subscriptions: 0, sent: 0, failed: 0 };
  }
  const json = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;
  await Promise.all(
    active.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          json,
          { TTL: 60 * 60 * 24 },
        );
        sent += 1;
        try {
          await db
            .update(webPushSubscriptionsTable)
            .set({ lastSuccessAt: new Date(), lastError: null, lastErrorAt: null })
            .where(eq(webPushSubscriptionsTable.id, sub.id));
        } catch (err) {
          logger.warn({ err, id: sub.id }, "Failed to mark push subscription successful");
        }
      } catch (err: unknown) {
        failed += 1;
        const status = (err as { statusCode?: number })?.statusCode;
        const message =
          err instanceof Error ? err.message : typeof err === "string" ? err : String(err);
        lastError = message;
        const gone = status === 404 || status === 410;
        try {
          if (gone) {
            await db
              .delete(webPushSubscriptionsTable)
              .where(eq(webPushSubscriptionsTable.id, sub.id));
            logger.info(
              { id: sub.id, endpoint: sub.endpoint, status },
              "Removed expired web push subscription",
            );
          } else {
            await db
              .update(webPushSubscriptionsTable)
              .set({
                lastError: message.slice(0, 500),
                lastErrorAt: new Date(),
              })
              .where(eq(webPushSubscriptionsTable.id, sub.id));
          }
        } catch (innerErr) {
          logger.warn({ err: innerErr, id: sub.id }, "Failed to record push subscription error");
        }
        logger.warn(
          { id: sub.id, status, error: message },
          "Web push delivery failed for subscription",
        );
      }
    }),
  );
  return {
    configured: true,
    subscriptions: active.length,
    sent,
    failed,
    error: failed > 0 && sent === 0 ? lastError : undefined,
  };
}

function dispatchPush(payload: PushPayload, context: string): void {
  if (!vapidConfigured) return;
  void sendWebPushToAll(payload).then((summary) => {
    if (summary.failed > 0) {
      logger.warn(
        { context, sent: summary.sent, failed: summary.failed },
        "Some web push deliveries failed",
      );
    }
  });
}

export async function sendTestNotificationPush(): Promise<{
  delivered: boolean;
  configured: boolean;
  sent: number;
  failed: number;
  subscriptions: number;
  error?: string;
}> {
  const summary = await sendWebPushToAll({
    kind: "test",
    title: "Test push from Vision9 Solar",
    body: `If you can see this, web push notifications are working. Sent at ${new Date().toLocaleTimeString()}.`,
    tag: "vision9-test",
  });
  const delivered = summary.configured && summary.sent > 0;
  if (delivered) {
    logger.info(
      { sent: summary.sent, subscriptions: summary.subscriptions },
      "Sent test web push",
    );
  } else if (summary.configured && summary.subscriptions === 0) {
    logger.info("Test web push skipped: no active subscriptions");
  } else {
    logger.warn({ error: summary.error }, "Test web push failed");
  }
  return {
    delivered,
    configured: summary.configured,
    sent: summary.sent,
    failed: summary.failed,
    subscriptions: summary.subscriptions,
    error:
      summary.error ??
      (!summary.configured
        ? "Web push is not configured on the server"
        : summary.subscriptions === 0
          ? "No browsers are subscribed to push notifications yet"
          : undefined),
  };
}

const DEFAULT_DEDUP_WINDOW_MS = 5 * 60 * 1000;
const NOTIFY_DEDUP_WINDOW_MS = (() => {
  const raw = process.env["NOTIFY_DEDUP_WINDOW_MS"];
  if (!raw) return DEFAULT_DEDUP_WINDOW_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_DEDUP_WINDOW_MS;
})();

const recentNotifications = new Map<string, number>();

function normalize(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function dedupKey(kind: string, email: unknown, phone: unknown): string | null {
  const e = normalize(email);
  const p = normalize(phone).replace(/[^\d+]/g, "");
  if (!e && !p) return null;
  return `${kind}|${e}|${p}`;
}

function shouldSkipDuplicate(key: string | null): boolean {
  if (!key || NOTIFY_DEDUP_WINDOW_MS <= 0) return false;
  const now = Date.now();
  for (const [k, ts] of recentNotifications) {
    if (now - ts > NOTIFY_DEDUP_WINDOW_MS) recentNotifications.delete(k);
  }
  const last = recentNotifications.get(key);
  if (last !== undefined && now - last <= NOTIFY_DEDUP_WINDOW_MS) return true;
  recentNotifications.set(key, now);
  return false;
}

function fmtField(label: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return `${label}: -`;
  return `${label}: ${String(value)}`;
}

export interface ContactSubmissionPayload {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
}

export function contactEmailBody(data: ContactSubmissionPayload): {
  subject: string;
  body: string;
} {
  const subject = `New contact submission from ${data.name}`;
  const body = [
    "A new contact form submission was received on vision9.biz.",
    "",
    fmtField("Name", data.name),
    fmtField("Email", data.email),
    fmtField("Phone", data.phone),
    "",
    "Message:",
    data.message,
  ].join("\n");
  return { subject, body };
}

export function contactSmsBody(data: ContactSubmissionPayload): string {
  const parts = [`New Vision9 contact: ${data.name}`];
  if (data.phone) parts.push(`Phone: ${data.phone}`);
  else parts.push(`Email: ${data.email}`);
  const summary = data.message.replace(/\s+/g, " ").trim();
  if (summary) parts.push(summary);
  return parts.join(" | ");
}

export function estimateEmailBody(data: Record<string, unknown>): {
  subject: string;
  body: string;
} {
  const name = typeof data["name"] === "string" ? (data["name"] as string) : "(unknown)";
  const subject = `New estimate request from ${name}`;
  const lines = ["A new estimate request was received on vision9.biz.", ""];
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object") {
      lines.push(`${key}:`);
      lines.push(JSON.stringify(value, null, 2));
    } else {
      lines.push(fmtField(key, value));
    }
  }
  return { subject, body: lines.join("\n") };
}

export function estimateSmsBody(data: Record<string, unknown>): string {
  const name = typeof data["name"] === "string" ? (data["name"] as string) : "(unknown)";
  const parts = [`New Vision9 estimate: ${name}`];
  const phone = data["phone"];
  const email = data["email"];
  if (typeof phone === "string" && phone) parts.push(`Phone: ${phone}`);
  else if (typeof email === "string" && email) parts.push(`Email: ${email}`);
  const extras: string[] = [];
  for (const key of ["address", "systemSize", "serviceType", "message", "notes"]) {
    const v = data[key];
    if (typeof v === "string" && v.trim()) extras.push(`${key}: ${v.trim()}`);
  }
  if (extras.length) parts.push(extras.join("; "));
  return parts.join(" | ");
}

async function getCurrentAttempts(
  kind: NotifyKind,
  id: number,
  channel: Channel,
): Promise<number> {
  try {
    if (kind === "contact") {
      const [row] = await db
        .select({
          emailAttempts: contactSubmissionsTable.emailAttempts,
          smsAttempts: contactSubmissionsTable.smsAttempts,
        })
        .from(contactSubmissionsTable)
        .where(eq(contactSubmissionsTable.id, id));
      if (!row) return 0;
      return channel === "email" ? row.emailAttempts : row.smsAttempts;
    }
    const [row] = await db
      .select({
        emailAttempts: estimateRequestsTable.emailAttempts,
        smsAttempts: estimateRequestsTable.smsAttempts,
      })
      .from(estimateRequestsTable)
      .where(eq(estimateRequestsTable.id, id));
    if (!row) return 0;
    return channel === "email" ? row.emailAttempts : row.smsAttempts;
  } catch (err) {
    logger.error({ err, kind, id, channel }, "Failed to read attempt count");
    return 0;
  }
}

async function persistOutcome(
  kind: NotifyKind,
  id: number,
  channel: Channel,
  outcome: DeliveryOutcome,
  attemptsCompleted: number,
): Promise<void> {
  const updates: Record<string, unknown> = {};
  let nextRetryAt: Date | null = null;
  if (outcome.status === "failed" && !outcome.permanent) {
    const delay = nextRetryDelayMs(attemptsCompleted);
    if (delay !== null) nextRetryAt = new Date(Date.now() + delay);
  }
  if (channel === "email") {
    updates.emailStatus = outcome.status;
    updates.emailError = outcome.error ?? null;
    updates.emailSentAt = outcome.status === "sent" ? (outcome.sentAt ?? new Date()) : null;
    if (outcome.status !== "skipped") updates.emailAttempts = attemptsCompleted;
    updates.emailNextRetryAt = nextRetryAt;
  } else {
    updates.smsStatus = outcome.status;
    updates.smsError = outcome.error ?? null;
    updates.smsSentAt = outcome.status === "sent" ? (outcome.sentAt ?? new Date()) : null;
    if (outcome.status !== "skipped") updates.smsAttempts = attemptsCompleted;
    updates.smsNextRetryAt = nextRetryAt;
  }
  try {
    if (kind === "contact") {
      await db
        .update(contactSubmissionsTable)
        .set(updates)
        .where(eq(contactSubmissionsTable.id, id));
    } else {
      await db
        .update(estimateRequestsTable)
        .set(updates)
        .where(eq(estimateRequestsTable.id, id));
    }
  } catch (err) {
    logger.error({ err, kind, id, channel }, "Failed to persist notification status");
  }
}

async function dispatch(
  kind: NotifyKind,
  id: number,
  channels: Channel[],
  email: { subject: string; body: string },
  sms: string,
): Promise<{ email?: DeliveryOutcome; sms?: DeliveryOutcome }> {
  const related: RelatedRef = { kind, id };
  const result: { email?: DeliveryOutcome; sms?: DeliveryOutcome } = {};
  if (channels.includes("email")) {
    const prior = await getCurrentAttempts(kind, id, "email");
    const outcome = await deliverEmail(email.subject, email.body, related);
    const attemptsCompleted = outcome.status === "skipped" ? prior : prior + 1;
    result.email = outcome;
    await persistOutcome(kind, id, "email", outcome, attemptsCompleted);
    if (outcome.status === "failed") {
      const exhausted = attemptsCompleted >= MAX_NOTIFICATION_ATTEMPTS || outcome.permanent;
      logger.error(
        {
          kind,
          id,
          error: outcome.error,
          attempts: attemptsCompleted,
          permanent: outcome.permanent ?? false,
          willRetry: !exhausted,
        },
        exhausted
          ? "Notification email failed permanently (no further retries)"
          : "Notification email failed; scheduled for retry",
      );
    }
  }
  if (channels.includes("sms")) {
    const prior = await getCurrentAttempts(kind, id, "sms");
    const outcome = await sendSms(sms, related);
    const attemptsCompleted = outcome.status === "skipped" ? prior : prior + 1;
    result.sms = outcome;
    await persistOutcome(kind, id, "sms", outcome, attemptsCompleted);
    if (outcome.status === "failed") {
      const exhausted = attemptsCompleted >= MAX_NOTIFICATION_ATTEMPTS || outcome.permanent;
      logger.error(
        {
          kind,
          id,
          error: outcome.error,
          attempts: attemptsCompleted,
          permanent: outcome.permanent ?? false,
          willRetry: !exhausted,
        },
        exhausted
          ? "Notification SMS failed permanently (no further retries)"
          : "Notification SMS failed; scheduled for retry",
      );
    }
  }
  return result;
}

async function resetAttempts(
  kind: NotifyKind,
  id: number,
  channels: Channel[],
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (channels.includes("email")) {
    updates.emailAttempts = 0;
    updates.emailNextRetryAt = null;
  }
  if (channels.includes("sms")) {
    updates.smsAttempts = 0;
    updates.smsNextRetryAt = null;
  }
  if (Object.keys(updates).length === 0) return;
  try {
    if (kind === "contact") {
      await db
        .update(contactSubmissionsTable)
        .set(updates)
        .where(eq(contactSubmissionsTable.id, id));
    } else {
      await db
        .update(estimateRequestsTable)
        .set(updates)
        .where(eq(estimateRequestsTable.id, id));
    }
  } catch (err) {
    logger.error({ err, kind, id, channels }, "Failed to reset notification attempts");
  }
}

export function notifyContactSubmission(id: number, data: ContactSubmissionPayload): void {
  const key = dedupKey("contact", data.email, data.phone);
  if (shouldSkipDuplicate(key)) {
    logger.info(
      { context: "contact-submission", email: data.email, phone: data.phone },
      "Duplicate lead notification suppressed within de-dup window",
    );
    return;
  }
  const email = contactEmailBody(data);
  const sms = contactSmsBody(data);
  dispatchInApp(
    "contact",
    `New contact submission from ${data.name}`,
    contactSmsBody(data),
    "contact-submission",
  );
  dispatchPush(
    {
      kind: "contact",
      title: `New contact submission from ${data.name}`,
      body: contactSmsBody(data),
      url: "/admin/contact",
      tag: `contact-${id}`,
    },
    "contact-submission",
  );
  void dispatch("contact", id, ["email", "sms"], email, sms);
}

export function notifyEstimateRequest(id: number, data: Record<string, unknown>): void {
  const key = dedupKey("estimate", data["email"], data["phone"]);
  if (shouldSkipDuplicate(key)) {
    logger.info(
      { context: "estimate-request", email: data["email"], phone: data["phone"] },
      "Duplicate lead notification suppressed within de-dup window",
    );
    return;
  }
  const email = estimateEmailBody(data);
  const sms = estimateSmsBody(data);
  const name = typeof data["name"] === "string" ? (data["name"] as string) : "(unknown)";
  dispatchInApp(
    "estimate",
    `New estimate request from ${name}`,
    estimateSmsBody(data),
    "estimate-request",
  );
  dispatchPush(
    {
      kind: "estimate",
      title: `New estimate request from ${name}`,
      body: estimateSmsBody(data),
      url: "/admin/estimates",
      tag: `estimate-${id}`,
    },
    "estimate-request",
  );
  void dispatch("estimate", id, ["email", "sms"], email, sms);
}

export async function resendContactNotification(
  id: number,
  data: ContactSubmissionPayload,
  channels: Channel[],
): Promise<{ email?: DeliveryOutcome; sms?: DeliveryOutcome }> {
  await resetAttempts("contact", id, channels);
  const email = contactEmailBody(data);
  const sms = contactSmsBody(data);
  return dispatch("contact", id, channels, email, sms);
}

export async function resendEstimateNotification(
  id: number,
  data: Record<string, unknown>,
  channels: Channel[],
): Promise<{ email?: DeliveryOutcome; sms?: DeliveryOutcome }> {
  await resetAttempts("estimate", id, channels);
  const email = estimateEmailBody(data);
  const sms = estimateSmsBody(data);
  return dispatch("estimate", id, channels, email, sms);
}

export async function retryNotificationChannel(
  kind: NotifyKind,
  id: number,
  channel: Channel,
): Promise<DeliveryOutcome | null> {
  if (kind === "contact") {
    const [row] = await db
      .select()
      .from(contactSubmissionsTable)
      .where(eq(contactSubmissionsTable.id, id));
    if (!row) return null;
    const email = contactEmailBody({
      name: row.name,
      email: row.email,
      phone: row.phone,
      message: row.message,
    });
    const sms = contactSmsBody({
      name: row.name,
      email: row.email,
      phone: row.phone,
      message: row.message,
    });
    const result = await dispatch("contact", id, [channel], email, sms);
    return result[channel] ?? null;
  }
  const [row] = await db
    .select()
    .from(estimateRequestsTable)
    .where(eq(estimateRequestsTable.id, id));
  if (!row) return null;
  const {
    id: _id,
    createdAt: _createdAt,
    emailStatus: _es,
    emailError: _ee,
    emailSentAt: _esa,
    emailAttempts: _ea,
    emailNextRetryAt: _enra,
    smsStatus: _ss,
    smsError: _se,
    smsSentAt: _ssa,
    smsAttempts: _sa,
    smsNextRetryAt: _snra,
    ...estimateData
  } = row;
  const email = estimateEmailBody(estimateData as Record<string, unknown>);
  const sms = estimateSmsBody(estimateData as Record<string, unknown>);
  const result = await dispatch("estimate", id, [channel], email, sms);
  return result[channel] ?? null;
}
