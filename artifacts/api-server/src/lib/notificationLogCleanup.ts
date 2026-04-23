import { lt, sql } from "drizzle-orm";
import { db, notificationLogTable } from "@workspace/db";
import { logger } from "./logger";

const DEFAULT_RETENTION_DAYS = 90;
const DEFAULT_MAX_ROWS = 1000;
const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export const NOTIFICATION_LOG_RETENTION_DAYS = readPositiveInt(
  "NOTIFICATION_LOG_RETENTION_DAYS",
  DEFAULT_RETENTION_DAYS,
);
export const NOTIFICATION_LOG_MAX_ROWS = readPositiveInt(
  "NOTIFICATION_LOG_MAX_ROWS",
  DEFAULT_MAX_ROWS,
);
const CLEANUP_INTERVAL_MS = readPositiveInt(
  "NOTIFICATION_LOG_CLEANUP_INTERVAL_MS",
  DEFAULT_INTERVAL_MS,
);

export async function pruneNotificationLog(): Promise<{
  deletedByAge: number;
  deletedByCap: number;
}> {
  let deletedByAge = 0;
  let deletedByCap = 0;
  try {
    const cutoff = new Date(Date.now() - NOTIFICATION_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const ageResult = await db
      .delete(notificationLogTable)
      .where(lt(notificationLogTable.createdAt, cutoff))
      .returning({ id: notificationLogTable.id });
    deletedByAge = ageResult.length;

    const capResult = await db.execute(sql`
      DELETE FROM ${notificationLogTable}
      WHERE id IN (
        SELECT id FROM ${notificationLogTable}
        ORDER BY created_at DESC, id DESC
        OFFSET ${NOTIFICATION_LOG_MAX_ROWS}
      )
      RETURNING id
    `);
    const rows = (capResult as unknown as { rows?: unknown[] }).rows;
    deletedByCap = Array.isArray(rows) ? rows.length : 0;

    if (deletedByAge > 0 || deletedByCap > 0) {
      logger.info(
        {
          deletedByAge,
          deletedByCap,
          retentionDays: NOTIFICATION_LOG_RETENTION_DAYS,
          maxRows: NOTIFICATION_LOG_MAX_ROWS,
        },
        "Pruned notification_log",
      );
    }
  } catch (err) {
    logger.error({ err }, "Failed to prune notification_log");
  }
  return { deletedByAge, deletedByCap };
}

let intervalHandle: NodeJS.Timeout | null = null;

export function startNotificationLogCleanup(): void {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    void pruneNotificationLog();
  }, CLEANUP_INTERVAL_MS);
  if (typeof intervalHandle.unref === "function") intervalHandle.unref();
  logger.info(
    {
      intervalMs: CLEANUP_INTERVAL_MS,
      retentionDays: NOTIFICATION_LOG_RETENTION_DAYS,
      maxRows: NOTIFICATION_LOG_MAX_ROWS,
    },
    "Scheduled notification_log cleanup",
  );
}
