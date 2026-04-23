import { logger } from "./logger";
import { sendMail } from "./mailer";

const NOTIFY_TO = process.env["NOTIFY_EMAIL_TO"] ?? "info@vision9.biz";
const NOTIFY_SMS_TO = process.env["NOTIFY_SMS_TO"];
const TWILIO_ACCOUNT_SID = process.env["TWILIO_ACCOUNT_SID"];
const TWILIO_AUTH_TOKEN = process.env["TWILIO_AUTH_TOKEN"];
const TWILIO_FROM_NUMBER = process.env["TWILIO_FROM_NUMBER"];
const SMS_MAX_LENGTH = 320;

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

function fmtField(label: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return `${label}: -`;
  return `${label}: ${String(value)}`;
}

async function sendNotification(subject: string, body: string): Promise<void> {
  await sendMail({
    to: NOTIFY_TO,
    subject,
    text: body,
    html: `<pre style="font-family:inherit;white-space:pre-wrap">${body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</pre>`,
  });
}

export interface ContactSubmissionPayload {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
}

export function notifyContactSubmission(data: ContactSubmissionPayload): void {
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

  sendNotification(subject, body).catch((err) => {
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

  sendNotification(subject, lines.join("\n")).catch((err) => {
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
