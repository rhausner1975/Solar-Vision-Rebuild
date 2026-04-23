import { ReplitConnectors } from "@replit/connectors-sdk";
import { eq } from "drizzle-orm";
import {
  db,
  contactSubmissionsTable,
  estimateRequestsTable,
  notificationSettingsTable,
  notificationLogTable,
} from "@workspace/db";
import { logger } from "./logger";

const FALLBACK_TO = process.env["NOTIFY_EMAIL_TO"] ?? "info@vision9.biz";

const NOTIFY_SMS_TO = process.env["NOTIFY_SMS_TO"];
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
      return { status: "failed", error };
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

async function sendSms(message: string, related: RelatedRef): Promise<DeliveryOutcome> {
  if (!NOTIFY_SMS_TO || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    return {
      status: "skipped",
      error:
        "SMS not configured: NOTIFY_SMS_TO, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER must all be set",
    };
  }
  const truncated =
    message.length > SMS_MAX_LENGTH ? `${message.slice(0, SMS_MAX_LENGTH - 1)}…` : message;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
    TWILIO_ACCOUNT_SID,
  )}/Messages.json`;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const body = new URLSearchParams({
    To: NOTIFY_SMS_TO,
    From: TWILIO_FROM_NUMBER,
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
        recipients: [NOTIFY_SMS_TO],
        subject: null,
        related,
        status: "failed",
        errorMessage: error.slice(0, 2000),
      });
      return { status: "failed", error };
    }
    await recordAttempt({
      channel: "sms",
      recipients: [NOTIFY_SMS_TO],
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
      recipients: [NOTIFY_SMS_TO],
      subject: null,
      related,
      status: "failed",
      errorMessage: error.slice(0, 2000),
    });
    return { status: "failed", error };
  }
}

export async function sendTestNotificationSms(): Promise<{
  delivered: boolean;
  recipient?: string;
  configured: boolean;
  error?: string;
}> {
  if (!NOTIFY_SMS_TO || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    const missing = [
      !NOTIFY_SMS_TO && "NOTIFY_SMS_TO",
      !TWILIO_ACCOUNT_SID && "TWILIO_ACCOUNT_SID",
      !TWILIO_AUTH_TOKEN && "TWILIO_AUTH_TOKEN",
      !TWILIO_FROM_NUMBER && "TWILIO_FROM_NUMBER",
    ]
      .filter(Boolean)
      .join(", ");
    logger.warn({ missing }, "Test SMS skipped: Twilio env vars not configured");
    return {
      delivered: false,
      configured: false,
      error: `SMS is not configured. Missing environment variables: ${missing}`,
    };
  }
  const message = `[TEST] Vision9 Solar SMS alert test sent at ${new Date().toISOString()}. If you received this, lead alerts to this number are working.`;
  try {
    await sendSms(message);
    logger.info({ recipient: NOTIFY_SMS_TO }, "Sent test notification SMS");
    return { delivered: true, configured: true, recipient: NOTIFY_SMS_TO };
  } catch (err) {
    logger.error({ err }, "Failed to send test notification SMS");
    const errMessage = err instanceof Error ? err.message : "Unknown error";
    return { delivered: false, configured: true, recipient: NOTIFY_SMS_TO, error: errMessage };
  }
}

function dispatchSms(message: string, context: string): void {
  if (!NOTIFY_SMS_TO || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    logger.warn({ context }, "SMS notification skipped: Twilio env vars not configured");
    return;
  }
  sendSms(message).catch((err) => {
    logger.error({ err, context }, "Failed to send SMS notification");
  });
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

function contactEmailBody(data: ContactSubmissionPayload): { subject: string; body: string } {
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

function contactSmsBody(data: ContactSubmissionPayload): string {
  const parts = [`New Vision9 contact: ${data.name}`];
  if (data.phone) parts.push(`Phone: ${data.phone}`);
  else parts.push(`Email: ${data.email}`);
  const summary = data.message.replace(/\s+/g, " ").trim();
  if (summary) parts.push(summary);
  return parts.join(" | ");
}

function estimateEmailBody(data: Record<string, unknown>): { subject: string; body: string } {
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

function estimateSmsBody(data: Record<string, unknown>): string {
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

async function persistOutcome(
  kind: NotifyKind,
  id: number,
  channel: Channel,
  outcome: DeliveryOutcome,
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (channel === "email") {
    updates.emailStatus = outcome.status;
    updates.emailError = outcome.error ?? null;
    updates.emailSentAt = outcome.status === "sent" ? (outcome.sentAt ?? new Date()) : null;
  } else {
    updates.smsStatus = outcome.status;
    updates.smsError = outcome.error ?? null;
    updates.smsSentAt = outcome.status === "sent" ? (outcome.sentAt ?? new Date()) : null;
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
    const outcome = await deliverEmail(email.subject, email.body, related);
    result.email = outcome;
    await persistOutcome(kind, id, "email", outcome);
    if (outcome.status === "failed") {
      logger.error({ kind, id, error: outcome.error }, "Notification email failed");
    }
  }
  if (channels.includes("sms")) {
    const outcome = await sendSms(sms, related);
    result.sms = outcome;
    await persistOutcome(kind, id, "sms", outcome);
    if (outcome.status === "failed") {
      logger.error({ kind, id, error: outcome.error }, "Notification SMS failed");
    }
  }
  return result;
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
  void dispatch("estimate", id, ["email", "sms"], email, sms);
}

export async function resendContactNotification(
  id: number,
  data: ContactSubmissionPayload,
  channels: Channel[],
): Promise<{ email?: DeliveryOutcome; sms?: DeliveryOutcome }> {
  const email = contactEmailBody(data);
  const sms = contactSmsBody(data);
  return dispatch("contact", id, channels, email, sms);
}

export async function resendEstimateNotification(
  id: number,
  data: Record<string, unknown>,
  channels: Channel[],
): Promise<{ email?: DeliveryOutcome; sms?: DeliveryOutcome }> {
  const email = estimateEmailBody(data);
  const sms = estimateSmsBody(data);
  return dispatch("estimate", id, channels, email, sms);
}
