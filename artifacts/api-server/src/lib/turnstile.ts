import { logger } from "./logger";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileVerifyResult {
  ok: boolean;
  reason?: string;
}

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp: string | undefined,
): Promise<TurnstileVerifyResult> {
  const secret = process.env["TURNSTILE_SECRET_KEY"];
  if (!secret) {
    logger.error(
      "TURNSTILE_SECRET_KEY is not configured; failing closed and rejecting submission",
    );
    return { ok: false, reason: "captcha-not-configured" };
  }
  if (!token || typeof token !== "string") {
    return { ok: false, reason: "missing-token" };
  }

  const body = new URLSearchParams();
  body.append("secret", secret);
  body.append("response", token);
  if (remoteIp) body.append("remoteip", remoteIp);

  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      response = await fetch(VERIFY_URL, {
        method: "POST",
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    logger.warn({ err }, "Turnstile siteverify request failed");
    return { ok: false, reason: "siteverify-network-error" };
  }

  if (!response.ok) {
    logger.warn(
      { status: response.status },
      "Turnstile siteverify returned non-2xx",
    );
    return { ok: false, reason: `siteverify-http-${response.status}` };
  }

  const data = (await response.json().catch(() => null)) as
    | { success?: boolean; "error-codes"?: string[] }
    | null;

  if (!data) {
    return { ok: false, reason: "siteverify-bad-json" };
  }
  if (data.success === true) {
    return { ok: true };
  }

  const codes = (data["error-codes"] ?? []).join(",");
  logger.info({ codes }, "Turnstile token rejected");
  return { ok: false, reason: codes || "siteverify-rejected" };
}
