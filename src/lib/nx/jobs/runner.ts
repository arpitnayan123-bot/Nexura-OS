import { log } from "@/lib/logger";
import { db } from "@/lib/db";

/* ============================================================
   NEXURA OS — NxJob DURABLE BACKGROUND QUEUE (backend-core-1)
   A single-node-safe job runner on the Prisma stack (SQLite WAL
   or Postgres row locks). Properties:

   - Durable: jobs live in NxJob rows; a crash loses nothing.
   - Deduped: dedupeKey UNIQUE + pre-check so the common case
     never hits the constraint (server logs stay clean).
   - Race-safe claim: a guarded conditional update
     (pending → running) means concurrent workers can never
     double-run a job.
   - Self-healing: every tick re-seeds the queue-scan chain if
     no pending/running scan exists — the queue survives test
     wipes, crashed ticks, and manual clears without a restart.
   - Compliance: retention-purge prunes expired session
     records, aged audit events, and finished job rows.
   ============================================================ */

export interface NxJobInput {
  type: string;
  dedupeKey: string;
  payload?: Record<string, unknown>;
  runAt?: Date;
  maxAttempts?: number;
}

export interface NxJobRecord {
  id: string;
  type: string;
  dedupeKey: string;
  payload: string;
  attempts: number;
  maxAttempts: number;
}

/** Enqueue with quiet dedupe: pre-check the key first (a failed
 *  INSERT still logs server-side even when the client swallows
 *  P2002), then fall back to the constraint for racing callers. */
export async function enqueueJob(input: NxJobInput): Promise<string | null> {
  const existing = await db.nxJob
    .findUnique({ where: { dedupeKey: input.dedupeKey }, select: { id: true } })
    .catch(() => null);
  if (existing) return null;
  try {
    const job = await db.nxJob.create({
      data: {
        type: input.type,
        dedupeKey: input.dedupeKey,
        payload: JSON.stringify(input.payload ?? {}),
        runAt: input.runAt ?? new Date(),
        maxAttempts: input.maxAttempts ?? 3,
      },
      select: { id: true },
    });
    return job.id;
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") return null; // raced — dedupe hit
    throw err;
  }
}

/** Atomically claim due pending jobs (pending → running). */
async function claimDueJobs(limit: number): Promise<NxJobRecord[]> {
  const due = await db.nxJob.findMany({
    where: { status: "pending", runAt: { lte: new Date() } },
    orderBy: { runAt: "asc" },
    take: limit,
    select: { id: true },
  });
  const claimed: NxJobRecord[] = [];
  for (const { id } of due) {
    const res = await db.nxJob.updateMany({
      where: { id, status: "pending" }, // guarded — loser of a race claims nothing
      data: { status: "running", startedAt: new Date(), attempts: { increment: 1 } },
    });
    if (res.count === 1) {
      const job = await db.nxJob.findUnique({
        where: { id },
        select: { id: true, type: true, dedupeKey: true, payload: true, attempts: true, maxAttempts: true },
      });
      if (job) claimed.push(job);
    }
  }
  return claimed;
}

/* ---------- Job handlers ---------- */

type JobHandler = (payload: Record<string, unknown>, job: NxJobRecord) => Promise<void>;
const handlers: Record<string, JobHandler> = {};

/** Register a job type. Idempotent — last registration wins. */
export function registerJob(type: string, handler: JobHandler): void {
  handlers[type] = handler;
}

const SCAN_INTERVAL_MS = 60_000;

/** queue-scan: heartbeat of the chain. Reschedules itself for the
 *  next minute (minute-grained dedupe) and queues the daily
 *  retention purge when it is not queued yet. */
registerJob("queue-scan", async () => {
  const nextAt = new Date(Date.now() + SCAN_INTERVAL_MS);
  const minuteKey = `queue-scan:${Math.floor(nextAt.getTime() / 60_000)}`;
  await enqueueJob({ type: "queue-scan", dedupeKey: minuteKey, runAt: nextAt });

  const today = new Date().toISOString().slice(0, 10);
  await enqueueJob({ type: "retention-purge", dedupeKey: `retention-purge:${today}` });
});

/** retention-purge: compliance cleanup, daily.
 *  - session records revoked/expired > 30 days
 *  - audit events older than NEXURA_RETENTION_DAYS (default 365)
 *  - finished job rows older than 7 days (queue hygiene) */
registerJob("retention-purge", async () => {
  const now = Date.now();
  const sessionCutoff = new Date(now - 30 * 24 * 3600_000);
  const retentionDays = Number(process.env.NEXURA_RETENTION_DAYS || 365);
  const auditCutoff = new Date(now - retentionDays * 24 * 3600_000);
  const jobCutoff = new Date(now - 7 * 24 * 3600_000);

  const [sessions, audits, jobs] = await Promise.all([
    db.nxSessionRecord.deleteMany({
      where: {
        OR: [{ revokedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
        updatedAt: { lt: sessionCutoff },
      },
    }),
    db.nxAuditEvent.deleteMany({ where: { createdAt: { lt: auditCutoff } } }),
    db.nxJob.deleteMany({ where: { status: { in: ["done", "dead"] }, finishedAt: { lt: jobCutoff } } }),
  ]);
  if (sessions.count || audits.count || jobs.count) {
    log.info("jobs", "retention purge complete", {
      sessions: sessions.count,
      auditEvents: audits.count,
      jobs: jobs.count,
    });
  }
});

/** Run a single claimed job to completion (with retry bookkeeping). */
async function runJob(job: NxJobRecord): Promise<void> {
  const handler = handlers[job.type];
  try {
    if (!handler) throw new Error(`no handler registered for type ${job.type}`);
    const payload = JSON.parse(job.payload || "{}") as Record<string, unknown>;
    await handler(payload, job);
    await db.nxJob.update({
      where: { id: job.id },
      data: { status: "done", finishedAt: new Date(), lastError: null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const dead = job.attempts >= job.maxAttempts;
    await db.nxJob
      .update({
        where: { id: job.id },
        data: {
          status: dead ? "dead" : "pending",
          // exponential backoff: 30s * 2^(attempts-1), capped at 10 min
          runAt: new Date(Date.now() + Math.min(30_000 * 2 ** (job.attempts - 1), 600_000)),
          lastError: message.slice(0, 500),
          ...(dead ? { finishedAt: new Date() } : {}),
        },
      })
      .catch(() => {});
    log.error("jobs", dead ? "job dead-lettered" : "job failed — will retry", {
      type: job.type,
      attempts: job.attempts,
      err: message.slice(0, 200),
    });
  }
}

/** One worker tick: heal the chain, claim due jobs, run them. */
export async function tick(limit = 10): Promise<void> {
  const claimed = await claimDueJobs(limit);
  for (const job of claimed) await runJob(job);
}

/** Self-heal: if the queue-scan chain is dead (no pending/running
 *  scan), reseed it. Minute-grained dedupe keeps this quiet. */
export async function healQueueChain(): Promise<void> {
  const alive = await db.nxJob.count({
    where: { type: "queue-scan", status: { in: ["pending", "running"] } },
  });
  if (alive === 0) {
    await enqueueJob({
      type: "queue-scan",
      dedupeKey: `queue-scan:heal:${Math.floor(Date.now() / 60_000)}`,
    });
    log.info("jobs", "queue chain healed — re-seeded queue-scan");
  }
}

/* ---------- Worker lifecycle ---------- */

const g = globalThis as unknown as { __nxJobWorker?: { timer: NodeJS.Timeout } };

/** Boot the worker exactly once per process. NEXURA_JOBS=off disables. */
export function startJobWorker(intervalMs = 15_000): void {
  if (process.env.NEXURA_JOBS === "off") {
    log.info("jobs", "worker disabled (NEXURA_JOBS=off)");
    return;
  }
  if (g.__nxJobWorker) return;
  const timer = setInterval(() => {
    void (async () => {
      try {
        await healQueueChain();
        await tick();
      } catch (err) {
        log.error("jobs", "tick failed", { err: err instanceof Error ? err.message : String(err) });
      }
    })();
  }, intervalMs);
  timer.unref?.();
  g.__nxJobWorker = { timer };
  log.info("jobs", "worker started", { intervalMs });

  // Seed the chain immediately (quiet if it already exists).
  void (async () => {
    try {
      await healQueueChain();
      await tick();
    } catch {
      /* first tick races boot — the interval self-heals anyway */
    }
  })();
}
