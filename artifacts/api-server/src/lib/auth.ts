import argon2 from "argon2";
import crypto from "node:crypto";
import { and, eq, lt, ne } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { db, adminUsersTable, adminSessionsTable, type AdminUser } from "@workspace/db";
import { logger } from "./logger";

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

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
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
