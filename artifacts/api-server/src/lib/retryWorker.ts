import { and, eq, isNotNull, lte, lt, asc } from "drizzle-orm";
import { db, contactSubmissionsTable, estimateRequestsTable } from "@workspace/db";
import { logger } from "./logger";
import {
  MAX_NOTIFICATION_ATTEMPTS,
  retryNotificationChannel,
  type Channel,
  type NotifyKind,
} from "./notify";

const DEFAULT_INTERVAL_MS = 30_000;
const BATCH_LIMIT = 25;

let timer: NodeJS.Timeout | null = null;
let running = false;

function getIntervalMs(): number {
  const raw = process.env["NOTIFY_RETRY_INTERVAL_MS"];
  if (!raw) return DEFAULT_INTERVAL_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1000 ? parsed : DEFAULT_INTERVAL_MS;
}

interface DueRow {
  kind: NotifyKind;
  id: number;
  channel: Channel;
}

async function findDue(now: Date): Promise<DueRow[]> {
  const due: DueRow[] = [];

  const contactEmail = await db
    .select({
      id: contactSubmissionsTable.id,
      nextRetryAt: contactSubmissionsTable.emailNextRetryAt,
    })
    .from(contactSubmissionsTable)
    .where(
      and(
        eq(contactSubmissionsTable.emailStatus, "failed"),
        isNotNull(contactSubmissionsTable.emailNextRetryAt),
        lte(contactSubmissionsTable.emailNextRetryAt, now),
        lt(contactSubmissionsTable.emailAttempts, MAX_NOTIFICATION_ATTEMPTS),
      ),
    )
    .orderBy(asc(contactSubmissionsTable.emailNextRetryAt))
    .limit(BATCH_LIMIT);
  for (const r of contactEmail) due.push({ kind: "contact", id: r.id, channel: "email" });

  const contactSms = await db
    .select({
      id: contactSubmissionsTable.id,
      nextRetryAt: contactSubmissionsTable.smsNextRetryAt,
    })
    .from(contactSubmissionsTable)
    .where(
      and(
        eq(contactSubmissionsTable.smsStatus, "failed"),
        isNotNull(contactSubmissionsTable.smsNextRetryAt),
        lte(contactSubmissionsTable.smsNextRetryAt, now),
        lt(contactSubmissionsTable.smsAttempts, MAX_NOTIFICATION_ATTEMPTS),
      ),
    )
    .orderBy(asc(contactSubmissionsTable.smsNextRetryAt))
    .limit(BATCH_LIMIT);
  for (const r of contactSms) due.push({ kind: "contact", id: r.id, channel: "sms" });

  const estEmail = await db
    .select({
      id: estimateRequestsTable.id,
      nextRetryAt: estimateRequestsTable.emailNextRetryAt,
    })
    .from(estimateRequestsTable)
    .where(
      and(
        eq(estimateRequestsTable.emailStatus, "failed"),
        isNotNull(estimateRequestsTable.emailNextRetryAt),
        lte(estimateRequestsTable.emailNextRetryAt, now),
        lt(estimateRequestsTable.emailAttempts, MAX_NOTIFICATION_ATTEMPTS),
      ),
    )
    .orderBy(asc(estimateRequestsTable.emailNextRetryAt))
    .limit(BATCH_LIMIT);
  for (const r of estEmail) due.push({ kind: "estimate", id: r.id, channel: "email" });

  const estSms = await db
    .select({
      id: estimateRequestsTable.id,
      nextRetryAt: estimateRequestsTable.smsNextRetryAt,
    })
    .from(estimateRequestsTable)
    .where(
      and(
        eq(estimateRequestsTable.smsStatus, "failed"),
        isNotNull(estimateRequestsTable.smsNextRetryAt),
        lte(estimateRequestsTable.smsNextRetryAt, now),
        lt(estimateRequestsTable.smsAttempts, MAX_NOTIFICATION_ATTEMPTS),
      ),
    )
    .orderBy(asc(estimateRequestsTable.smsNextRetryAt))
    .limit(BATCH_LIMIT);
  for (const r of estSms) due.push({ kind: "estimate", id: r.id, channel: "sms" });

  return due;
}

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const due = await findDue(new Date());
    if (due.length === 0) return;
    logger.info({ count: due.length }, "Processing due notification retries");
    for (const item of due) {
      try {
        const outcome = await retryNotificationChannel(item.kind, item.id, item.channel);
        if (outcome) {
          logger.info(
            {
              kind: item.kind,
              id: item.id,
              channel: item.channel,
              status: outcome.status,
            },
            "Notification retry attempt completed",
          );
        }
      } catch (err) {
        logger.error({ err, ...item }, "Error during notification retry");
      }
    }
  } catch (err) {
    logger.error({ err }, "Notification retry worker tick failed");
  } finally {
    running = false;
  }
}

export function startNotificationRetryWorker(): void {
  if (timer) return;
  const interval = getIntervalMs();
  logger.info({ intervalMs: interval }, "Starting notification retry worker");
  timer = setInterval(() => {
    void tick();
  }, interval);
  if (typeof timer.unref === "function") timer.unref();
  setTimeout(() => {
    void tick();
  }, 5_000).unref?.();
}

export function stopNotificationRetryWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export const __test = { tick, findDue };
