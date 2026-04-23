import { lt, sql } from "drizzle-orm";
import { db, spamBlockLogTable } from "@workspace/db";
import { logger } from "./logger";

const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export const SPAM_BLOCK_LOG_RETENTION_DAYS = readPositiveInt(
  "SPAM_BLOCK_LOG_RETENTION_DAYS",
  DEFAULT_RETENTION_DAYS,
);
const CLEANUP_INTERVAL_MS = readPositiveInt(
  "SPAM_BLOCK_LOG_CLEANUP_INTERVAL_MS",
  DEFAULT_INTERVAL_MS,
);

export type SpamBlockReason =
  | "honeypot"
  | "too-fast"
  | "missing-timestamp"
  | "captcha-failed";

export async function recordSpamBlock(args: {
  formName: string;
  reason: SpamBlockReason;
  ip?: string | null;
}): Promise<void> {
  try {
    await db.insert(spamBlockLogTable).values({
      formName: args.formName,
      reason: args.reason,
      ip: args.ip ?? null,
    });
  } catch (err) {
    // Recording must never break the request path.
    logger.error({ err, formName: args.formName, reason: args.reason }, "Failed to record spam block");
  }
}

export type SpamBlockStats = {
  today: number;
  week: number;
  byReasonWeek: Record<string, number>;
  retentionDays: number;
};

export async function getSpamBlockStats(): Promise<SpamBlockStats> {
  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')::int  AS today,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS week,
      reason,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS reason_week
    FROM ${spamBlockLogTable}
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY ROLLUP(reason)
  `);
  const rows = ((result as unknown as { rows?: Array<Record<string, unknown>> }).rows ?? []);
  let today = 0;
  let week = 0;
  const byReasonWeek: Record<string, number> = {};
  for (const r of rows) {
    if (r.reason === null || r.reason === undefined) {
      today = Number(r.today ?? 0);
      week = Number(r.week ?? 0);
    } else {
      byReasonWeek[String(r.reason)] = Number(r.reason_week ?? 0);
    }
  }
  return {
    today,
    week,
    byReasonWeek,
    retentionDays: SPAM_BLOCK_LOG_RETENTION_DAYS,
  };
}

export async function pruneSpamBlockLog(): Promise<{ deletedByAge: number }> {
  let deletedByAge = 0;
  try {
    const cutoff = new Date(
      Date.now() - SPAM_BLOCK_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const ageResult = await db
      .delete(spamBlockLogTable)
      .where(lt(spamBlockLogTable.createdAt, cutoff))
      .returning({ id: spamBlockLogTable.id });
    deletedByAge = ageResult.length;
    if (deletedByAge > 0) {
      logger.info(
        { deletedByAge, retentionDays: SPAM_BLOCK_LOG_RETENTION_DAYS },
        "Pruned spam_block_log",
      );
    }
  } catch (err) {
    logger.error({ err }, "Failed to prune spam_block_log");
  }
  return { deletedByAge };
}

let intervalHandle: NodeJS.Timeout | null = null;

export function startSpamBlockLogCleanup(): void {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    void pruneSpamBlockLog();
  }, CLEANUP_INTERVAL_MS);
  if (typeof intervalHandle.unref === "function") intervalHandle.unref();
  logger.info(
    {
      intervalMs: CLEANUP_INTERVAL_MS,
      retentionDays: SPAM_BLOCK_LOG_RETENTION_DAYS,
    },
    "Scheduled spam_block_log cleanup",
  );
}
