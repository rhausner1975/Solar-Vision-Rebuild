import { and, isNotNull, lt, sql } from "drizzle-orm";
import { db, inAppNotificationsTable } from "@workspace/db";
import { logger } from "./logger";

const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_MAX_ROWS = 1000;
const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export const IN_APP_NOTIFICATIONS_RETENTION_DAYS = readPositiveInt(
  "IN_APP_NOTIFICATIONS_RETENTION_DAYS",
  DEFAULT_RETENTION_DAYS,
);
export const IN_APP_NOTIFICATIONS_MAX_ROWS = readPositiveInt(
  "IN_APP_NOTIFICATIONS_MAX_ROWS",
  DEFAULT_MAX_ROWS,
);
const CLEANUP_INTERVAL_MS = readPositiveInt(
  "IN_APP_NOTIFICATIONS_CLEANUP_INTERVAL_MS",
  DEFAULT_INTERVAL_MS,
);

export async function pruneInAppNotifications(): Promise<{
  deletedByAge: number;
  deletedByCap: number;
}> {
  let deletedByAge = 0;
  let deletedByCap = 0;
  try {
    const cutoff = new Date(
      Date.now() - IN_APP_NOTIFICATIONS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const ageResult = await db
      .delete(inAppNotificationsTable)
      .where(
        and(
          isNotNull(inAppNotificationsTable.readAt),
          lt(inAppNotificationsTable.readAt, cutoff),
        ),
      )
      .returning({ id: inAppNotificationsTable.id });
    deletedByAge = ageResult.length;

    const capResult = await db.execute(sql`
      DELETE FROM ${inAppNotificationsTable}
      WHERE read_at IS NOT NULL
        AND id IN (
          SELECT id FROM ${inAppNotificationsTable}
          WHERE read_at IS NOT NULL
          ORDER BY created_at DESC, id DESC
          OFFSET ${IN_APP_NOTIFICATIONS_MAX_ROWS}
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
          retentionDays: IN_APP_NOTIFICATIONS_RETENTION_DAYS,
          maxRows: IN_APP_NOTIFICATIONS_MAX_ROWS,
        },
        "Pruned in_app_notifications",
      );
    }
  } catch (err) {
    logger.error({ err }, "Failed to prune in_app_notifications");
  }
  return { deletedByAge, deletedByCap };
}

let intervalHandle: NodeJS.Timeout | null = null;

export function startInAppNotificationsCleanup(): void {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    void pruneInAppNotifications();
  }, CLEANUP_INTERVAL_MS);
  if (typeof intervalHandle.unref === "function") intervalHandle.unref();
  logger.info(
    {
      intervalMs: CLEANUP_INTERVAL_MS,
      retentionDays: IN_APP_NOTIFICATIONS_RETENTION_DAYS,
      maxRows: IN_APP_NOTIFICATIONS_MAX_ROWS,
    },
    "Scheduled in_app_notifications cleanup",
  );
}
