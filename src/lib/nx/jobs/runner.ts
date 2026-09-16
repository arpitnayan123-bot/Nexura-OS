import { log } from "@/lib/logger";
import { db } from "@/lib/db";

/* ============================================================
   NEXURA OS — NxJob DURABLE BACKGROUND QUEUE (backend-core-1,
   Postgres-hardened in stateless-1)
   A durable job runner on the Prisma/Postgres stack. Properties:

   - Durable: jobs live in NxJob rows; a crash loses nothing.
   - Multi-instance: the claim is a single SELECT ... FOR UPDATE
     SKIP LOCKED transaction — concurrent workers on any number
     of app instances never see (and never double-run) the same
     row. Every instance runs its own worker loop; the DB is the
     only coordination point.
   - Deduped: dedupeKey UNIQUE + pre-check so the common case
     never hits the constraint (server logs stay clean).
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

/** Enqueue with quiet dedupe. Dedupe semantics: an ACTIVE job
 *  (pending/running) with the same key blocks creation; a stale
 *  done/dead row is replaced (otherwise a finished job with a
 *  cyclical key — e.g. a heal seed — would block re-seeding
 *  forever). The UNIQUE constraint stays as the race backstop. */
export async function enqueueJob(input: NxJobInput): Promise<string | null> {
  const active = await db.nxJob
    .findFirst({
      where: { dedupeKey: input.dedupeKey, status: { in: ["pending", "running"] } },
      select: { id: true },
    })
    .catch(() => null);
  if (active) return null;
  const create = () =>
    db.nxJob.create({
      data: {
        type: input.type,
        dedupeKey: input.dedupeKey,
        payload: JSON.stringify(input.payload ?? {}),
        runAt: input.runAt ?? new Date(),
        maxAttempts: input.maxAttempts ?? 3,
      },
      select: { id: true },
    });
  try {
    const job = await create();
    return job.id;
  } catch (err) {
    if ((err as { code?: string }).code !== "P2002") throw err;
    // Constraint hit: a row with this key exists. If it is stale
    // (done/dead), replace it once; if active, we raced a live job.
    const stale = await db.nxJob
      .deleteMany({ where: { dedupeKey: input.dedupeKey, status: { in: ["done", "dead"] } } })
      .catch(() => ({ count: 0 }));
    if (!stale.count) return null;
    try {
      const job = await create();
      return job.id;
    } catch {
      return null; // lost a genuine race — dedupe hit
    }
  }
}

/** Atomically claim due pending jobs. One statement selects due rows
 *  WITH row locks (SKIP LOCKED — concurrent workers skip locked rows
 *  instead of blocking), then flips them to running inside the same
 *  transaction. Correct across any number of app instances. */
async function claimDueJobs(limit: number): Promise<NxJobRecord[]> {
  return db.$transaction(
    async (tx) => {
      const due = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "NxJob"
        WHERE status = 'pending' AND "runAt" <= now()
        ORDER BY "runAt" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED`;
      if (!due.length) return [];
      const ids = due.map((d) => d.id);
      await tx.nxJob.updateMany({
        where: { id: { in: ids }, status: "pending" }, // guarded — belt and braces
        data: { status: "running", startedAt: new Date(), attempts: { increment: 1 } },
      });
      return tx.nxJob.findMany({
        where: { id: { in: ids }, status: "running" },
        select: { id: true, type: true, dedupeKey: true, payload: true, attempts: true, maxAttempts: true },
      });
    },
    { maxWait: 2_000, timeout: 8_000 }
  );
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
        lastSeenAt: { lt: sessionCutoff },
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

/* ---------- Worker lifecycle ----------

   The globalThis timer guard is per-PROCESS LIFECYCLE state, not shared
   application state: each app instance SHOULD run its own worker loop
   (the DB claim above makes that safe), and the guard simply prevents
   one process from stacking duplicate intervals across dev-HMR reloads. */

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
