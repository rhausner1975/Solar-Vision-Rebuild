import argon2 from "argon2";
import crypto from "node:crypto";
import { and, eq, isNull, lt, ne } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import {
  db,
  adminUsersTable,
  adminSessionsTable,
  passwordResetTokensTable,
  type AdminUser,
} from "@workspace/db";
import { logger } from "./logger";

const RESET_TOKEN_TTL_MS = 1000 * 60 * 15;

const SESSION_COOKIE = "v9_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

export async function createSession(userId: number, res: Response): Promise<string> {
  const id = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(adminSessionsTable).values({ id, userId, expiresAt });
  res.cookie(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
  return id;
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const id = req.cookies?.[SESSION_COOKIE];
  if (id) {
    await db.delete(adminSessionsTable).where(eq(adminSessionsTable.id, id));
  }
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function getCurrentAdmin(req: Request): Promise<AdminUser | null> {
  const id = req.cookies?.[SESSION_COOKIE];
  if (!id || typeof id !== "string") return null;
  const [row] = await db
    .select()
    .from(adminSessionsTable)
    .where(eq(adminSessionsTable.id, id))
    .innerJoin(adminUsersTable, eq(adminSessionsTable.userId, adminUsersTable.id));
  if (!row) return null;
  if (row.admin_sessions.expiresAt.getTime() < Date.now()) {
    await db.delete(adminSessionsTable).where(eq(adminSessionsTable.id, id));
    return null;
  }
  return row.admin_users;
}

// CSRF defence for cookie-authenticated mutating requests:
// SameSite=Strict on the session cookie blocks cross-site requests from
// attaching the cookie. We additionally verify that the Origin (or Referer
// when Origin is absent) of any unsafe-method request matches the request's
// own Host header. Any mismatch (cross-site forgery attempt) is rejected.
function isSameOrigin(req: Request): boolean {
  const method = (req.method || "").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  const host = req.get("host");
  if (!host) return false;
  const origin = req.get("origin");
  const referer = req.get("referer");
  const candidate = origin || referer;
  if (!candidate) {
    // Hard-require an Origin/Referer on cookie-auth mutating requests.
    return false;
  }
  try {
    const url = new URL(candidate);
    return url.host === host;
  } catch {
    return false;
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "Cross-site request blocked" });
    return;
  }
  const admin = await getCurrentAdmin(req);
  if (!admin) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  // Force password change before any other privileged action.
  // The only routes allowed while mustChangePassword=true are /admin/me,
  // /admin/logout, and /admin/password (handled by their own checks).
  const path = req.path || req.url || "";
  const isPasswordChangeRoute = path.endsWith("/password");
  if (admin.mustChangePassword && !isPasswordChangeRoute) {
    res.status(403).json({ error: "Password change required", mustChangePassword: true });
    return;
  }
  (req as Request & { admin: AdminUser }).admin = admin;
  next();
}

export async function revokeOtherSessions(userId: number, currentSessionId: string): Promise<void> {
  await db
    .delete(adminSessionsTable)
    .where(
      and(eq(adminSessionsTable.userId, userId), ne(adminSessionsTable.id, currentSessionId)),
    );
}

export function getCurrentSessionId(req: Request): string | undefined {
  const id = req.cookies?.[SESSION_COOKIE];
  return typeof id === "string" ? id : undefined;
}

export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(adminSessionsTable).where(lt(adminSessionsTable.expiresAt, new Date()));
  await db
    .delete(passwordResetTokensTable)
    .where(lt(passwordResetTokensTable.expiresAt, new Date()));
}

export async function revokeAllSessions(userId: number): Promise<void> {
  await db.delete(adminSessionsTable).where(eq(adminSessionsTable.userId, userId));
}

function hashResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function createPasswordResetToken(userId: number): Promise<{
  rawToken: string;
  expiresAt: Date;
}> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await db.insert(passwordResetTokensTable).values({ userId, tokenHash, expiresAt });
  return { rawToken, expiresAt };
}

export async function consumePasswordResetToken(
  rawToken: string,
): Promise<{ userId: number } | null> {
  if (typeof rawToken !== "string" || rawToken.length < 32) return null;
  const tokenHash = hashResetToken(rawToken);
  const [row] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.tokenHash, tokenHash),
        isNull(passwordResetTokensTable.usedAt),
      ),
    );
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  const now = new Date();
  const updated = await db
    .update(passwordResetTokensTable)
    .set({ usedAt: now })
    .where(
      and(
        eq(passwordResetTokensTable.id, row.id),
        isNull(passwordResetTokensTable.usedAt),
      ),
    )
    .returning({ id: passwordResetTokensTable.id });
  if (updated.length === 0) return null;
  return { userId: row.userId };
}

export async function invalidateActiveResetTokens(userId: number): Promise<void> {
  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokensTable.userId, userId),
        isNull(passwordResetTokensTable.usedAt),
      ),
    );
}

export async function seedDefaultAdmin(): Promise<void> {
  const username = process.env.ADMIN_USERNAME;
  const initial = process.env.ADMIN_INITIAL_PASSWORD;
  if (!username || !initial) {
    logger.warn("ADMIN_USERNAME or ADMIN_INITIAL_PASSWORD not set; skipping admin seed");
    return;
  }
  const [existing] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, username));
  if (existing) {
    logger.info({ username }, "Admin already exists; not reseeding");
    return;
  }
  const passwordHash = await hashPassword(initial);
  await db.insert(adminUsersTable).values({
    username,
    passwordHash,
    mustChangePassword: true,
  });
  logger.info({ username }, "Seeded default admin user");
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
