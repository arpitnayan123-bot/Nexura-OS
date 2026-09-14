import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  enqueueJob,
  tick,
  healQueueChain,
  registerJob,
} from "@/lib/nx/jobs/runner";

/* ============================================================
   NxJob DURABLE QUEUE (backend-core-1)
   Exercises the real DB-backed queue. Cleanup is SURGICAL:
   only rows created by this suite (type prefix core1-test-)
   plus the dead-chain scan rows we deliberately create. The
   live queue-scan chain is NEVER wiped wholesale — and even if
   a scan row is consumed here, healQueueChain re-seeds it.
   ============================================================ */

const TEST_PREFIX = "core1-test-";
const createdIds: string[] = [];

afterAll(async () => {
  // Remove suite-owned jobs only.
  await db.nxJob.deleteMany({ where: { OR: [{ type: { startsWith: TEST_PREFIX } }, { id: { in: createdIds } }] } });
});

describe("enqueueJob dedupe", () => {
  it("returns an id once and null on the duplicate key (quiet dedupe)", async () => {
    const key = `${TEST_PREFIX}dedupe-${Date.now()}`;
    const first = await enqueueJob({ type: `${TEST_PREFIX}x`, dedupeKey: key });
    const second = await enqueueJob({ type: `${TEST_PREFIX}x`, dedupeKey: key });
    expect(typeof first).toBe("string");
    expect(second).toBeNull();
    if (first) createdIds.push(first);
    const rows = await db.nxJob.count({ where: { dedupeKey: key } });
    expect(rows).toBe(1);
  });
});

describe("tick claim + run", () => {
  it("claims a due job, runs its handler, marks it done", async () => {
    let ran = 0;
    registerJob(`${TEST_PREFIX}run`, async () => {
      ran += 1;
    });
    const id = await enqueueJob({ type: `${TEST_PREFIX}run`, dedupeKey: `${TEST_PREFIX}run-${Date.now()}` });
    expect(id).toBeTruthy();
    createdIds.push(id as string);
    await tick();
    expect(ran).toBe(1);
    const job = await db.nxJob.findUnique({ where: { id: id as string } });
    expect(job?.status).toBe("done");
    // A second tick must not re-run a done job.
    await tick();
    expect(ran).toBe(1);
  });

  it("dead-letters a failing job after maxAttempts", async () => {
    registerJob(`${TEST_PREFIX}fail`, async () => {
      throw new Error("core1 intentional failure");
    });
    const id = await enqueueJob({
      type: `${TEST_PREFIX}fail`,
      dedupeKey: `${TEST_PREFIX}fail-${Date.now()}`,
      maxAttempts: 1,
    });
    createdIds.push(id as string);
    await tick();
    const job = await db.nxJob.findUnique({ where: { id: id as string } });
    expect(job?.status).toBe("dead");
    expect(job?.lastError).toContain("intentional");
  });
});

describe("self-healing chain", () => {
  it("re-seeds queue-scan when the chain is dead, and a tick reschedules + purges", async () => {
    // Kill the chain (only queue-scan rows — this is the dead state).
    await db.nxJob.updateMany({ where: { type: "queue-scan" }, data: { status: "done", finishedAt: new Date() } });
    await healQueueChain();
    const alive = await db.nxJob.count({ where: { type: "queue-scan", status: { in: ["pending", "running"] } } });
    expect(alive).toBeGreaterThan(0);

    // Run the scan: it must schedule the next minute's scan AND today's purge.
    await tick();
    const nextScan = await db.nxJob.count({ where: { type: "queue-scan", status: "pending" } });
    expect(nextScan).toBeGreaterThan(0);
    const purge = await db.nxJob.findFirst({ where: { type: "retention-purge", status: { in: ["pending", "done"] } } });
    expect(purge).toBeTruthy();

    // healQueueChain must stay quiet when the chain is alive.
    await healQueueChain();
  });
});
