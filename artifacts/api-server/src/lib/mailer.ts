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

export async function sendMail(input: SendMailInput): Promise<{ delivered: boolean }> {
  const client = getClient();
  if (!client) {
    // Do NOT log the email body. For password-reset emails the body contains a
    // live one-time token; logging it would put the token in plaintext in the
    // server logs and effectively defeat the reset flow. Operators must set
    // RESEND_API_KEY (or another configured transport) for delivery.
    logger.warn(
      { to: input.to, subject: input.subject },
      "RESEND_API_KEY not set; email not sent. Configure a mail transport.",
    );
    return { delivered: false };
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
      return { delivered: false };
    }
    logger.info(
      { to: input.to, subject: input.subject, id: result.data?.id },
      "Email sent via Resend",
    );
    return { delivered: true };
  } catch (err) {
    logger.error({ err, to: input.to, subject: input.subject }, "Failed to send email via Resend");
    return { delivered: false };
  }
}
