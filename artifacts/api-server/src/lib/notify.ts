import { ReplitConnectors } from "@replit/connectors-sdk";
import { db, notificationSettingsTable } from "@workspace/db";
import { logger } from "./logger";

const FALLBACK_TO = process.env["NOTIFY_EMAIL_TO"] ?? "info@vision9.biz";

const NOTIFY_SMS_TO = process.env["NOTIFY_SMS_TO"];
const TWILIO_ACCOUNT_SID = process.env["TWILIO_ACCOUNT_SID"];
const TWILIO_AUTH_TOKEN = process.env["TWILIO_AUTH_TOKEN"];
const TWILIO_FROM_NUMBER = process.env["TWILIO_FROM_NUMBER"];
const SMS_MAX_LENGTH = 320;

const connectors = new ReplitConnectors();

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

async function sendEmail(
  subject: string,
  body: string,
  overrideRecipients?: string[],
): Promise<void> {
  const recipients =
    overrideRecipients && overrideRecipients.length > 0
      ? overrideRecipients
      : await getRecipients();
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
    throw new Error(`Gmail send failed: ${response.status} ${text}`);
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
  try {
    await sendEmail(subject, body, recipients);
    logger.info({ recipients }, "Sent test notification email");
    return { delivered: true, recipients };
  } catch (err) {
    logger.error({ err, recipients }, "Failed to send test notification email");
    const message = err instanceof Error ? err.message : "Unknown error";
    return { delivered: false, recipients, error: message };
  }
}

async function sendSms(message: string): Promise<void> {
  if (!NOTIFY_SMS_TO || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    throw new Error(
      "SMS not configured: NOTIFY_SMS_TO, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER must all be set",
    );
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
    throw new Error(`Twilio send failed: ${response.status} ${text}`);
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

export function notifyContactSubmission(data: ContactSubmissionPayload): void {
  const key = dedupKey("contact", data.email, data.phone);
  if (shouldSkipDuplicate(key)) {
    logger.info(
      { context: "contact-submission", email: data.email, phone: data.phone },
      "Duplicate lead notification suppressed within de-dup window",
    );
    return;
  }
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

  sendEmail(subject, body).catch((err) => {
    logger.error({ err }, "Failed to send contact submission notification email");
  });

  const smsParts = [`New Vision9 contact: ${data.name}`];
  if (data.phone) smsParts.push(`Phone: ${data.phone}`);
  else smsParts.push(`Email: ${data.email}`);
  const summary = data.message.replace(/\s+/g, " ").trim();
  if (summary) smsParts.push(summary);
  dispatchSms(smsParts.join(" | "), "contact-submission");
}

export function notifyEstimateRequest(data: Record<string, unknown>): void {
  const name = typeof data["name"] === "string" ? (data["name"] as string) : "(unknown)";
  const dedup = dedupKey("estimate", data["email"], data["phone"]);
  if (shouldSkipDuplicate(dedup)) {
    logger.info(
      { context: "estimate-request", email: data["email"], phone: data["phone"] },
      "Duplicate lead notification suppressed within de-dup window",
    );
    return;
  }
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

  sendEmail(subject, lines.join("\n")).catch((err) => {
    logger.error({ err }, "Failed to send estimate request notification email");
  });

  const smsParts = [`New Vision9 estimate: ${name}`];
  const phone = data["phone"];
  const email = data["email"];
  if (typeof phone === "string" && phone) smsParts.push(`Phone: ${phone}`);
  else if (typeof email === "string" && email) smsParts.push(`Email: ${email}`);
  const extras: string[] = [];
  for (const key of ["address", "systemSize", "serviceType", "message", "notes"]) {
    const v = data[key];
    if (typeof v === "string" && v.trim()) extras.push(`${key}: ${v.trim()}`);
  }
  if (extras.length) smsParts.push(extras.join("; "));
  dispatchSms(smsParts.join(" | "), "estimate-request");
}
