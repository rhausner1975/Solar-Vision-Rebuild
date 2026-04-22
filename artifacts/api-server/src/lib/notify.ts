import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./logger";

const NOTIFY_TO = process.env["NOTIFY_EMAIL_TO"] ?? "info@vision9.biz";

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

async function sendEmail(subject: string, body: string): Promise<void> {
  const raw = base64UrlEncode(buildRfc822(NOTIFY_TO, subject, body));
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

  sendEmail(subject, lines.join("\n")).catch((err) => {
    logger.error({ err }, "Failed to send estimate request notification email");
  });
}
