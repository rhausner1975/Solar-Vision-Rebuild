import { randomUUID } from "node:crypto";

export type BackfillJobState = "pending" | "running" | "completed" | "failed";

export interface BackfillJob {
  id: string;
  state: BackfillJobState;
  total: number;
  processed: number;
  generated: number;
  failed: number;
  force: boolean;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
}

const jobs = new Map<string, BackfillJob>();

const MAX_JOBS = 50;
const RETAIN_FINISHED_MS = 60 * 60 * 1000;

function prune(): void {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (
      job.finishedAt &&
      now - new Date(job.finishedAt).getTime() > RETAIN_FINISHED_MS
    ) {
      jobs.delete(id);
    }
  }
  if (jobs.size > MAX_JOBS) {
    const sorted = [...jobs.values()].sort((a, b) =>
      a.startedAt.localeCompare(b.startedAt),
    );
    const excess = sorted.length - MAX_JOBS;
    for (let i = 0; i < excess; i++) {
      const j = sorted[i];
      if (j.state === "completed" || j.state === "failed") jobs.delete(j.id);
    }
  }
}

export function createBackfillJob(force: boolean): BackfillJob {
  prune();
  const job: BackfillJob = {
    id: randomUUID(),
    state: "pending",
    total: 0,
    processed: 0,
    generated: 0,
    failed: 0,
    force,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null,
  };
  jobs.set(job.id, job);
  return job;
}

export function getBackfillJob(id: string): BackfillJob | undefined {
  return jobs.get(id);
}

export function updateBackfillJob(
  id: string,
  patch: Partial<BackfillJob>,
): void {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, patch);
}
