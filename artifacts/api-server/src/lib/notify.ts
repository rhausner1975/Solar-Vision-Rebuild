import { logger } from "./logger";
import { sendMail } from "./mailer";

const NOTIFY_TO = process.env["NOTIFY_EMAIL_TO"] ?? "info@vision9.biz";

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
}
