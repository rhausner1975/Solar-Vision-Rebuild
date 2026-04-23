import { Resend } from "resend";
import { logger } from "./logger";

let cachedResend: Resend | null = null;
let cachedApiKey: string | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (cachedResend && cachedApiKey === apiKey) return cachedResend;
  cachedResend = new Resend(apiKey);
  cachedApiKey = apiKey;
  return cachedResend;
}

export function getAdminNotificationEmail(): string {
  return process.env.ADMIN_NOTIFICATION_EMAIL || "info@vision9.biz";
}

export function getMailFrom(): string {
  return (
    process.env.MAIL_FROM ||
    "Vision9 Solar <onboarding@resend.dev>"
  );
}

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export type DeliveryStatus = "sent" | "failed" | "skipped";

export interface SendMailResult {
  status: DeliveryStatus;
  /** True for backward compatibility with prior callers. */
  delivered: boolean;
  error?: string;
  id?: string;
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const client = getClient();
  if (!client) {
    logger.warn(
      { to: input.to, subject: input.subject },
      "RESEND_API_KEY not set; email not sent. Configure a mail transport.",
    );
    return {
      status: "skipped",
      delivered: false,
      error: "RESEND_API_KEY not configured",
    };
  }
  try {
    const result = await client.emails.send({
      from: getMailFrom(),
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    if (result.error) {
      logger.error(
        { err: result.error, to: input.to, subject: input.subject },
        "Resend rejected email",
      );
      return {
        status: "failed",
        delivered: false,
        error: result.error.message ?? String(result.error),
      };
    }
    logger.info(
      { to: input.to, subject: input.subject, id: result.data?.id },
      "Email sent via Resend",
    );
    return { status: "sent", delivered: true, id: result.data?.id };
  } catch (err) {
    logger.error({ err, to: input.to, subject: input.subject }, "Failed to send email via Resend");
    return {
      status: "failed",
      delivered: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
