import { describe, it, expect, afterAll } from "vitest";
import { consumeRateLimit, peekRateLimit, type RateResult } from "@/lib/rate-limit";
import { isRedisConfigured } from "@/lib/redis";

/* ============================================================
   DISTRIBUTED RATE LIMITER (stateless-1)
   Contract pinning for both modes:
   - Redis mode (sandbox/CI set REDIS_URL): the budget is shared
     across every consumer — two sequential calls draw down the
     SAME window (this is what per-process Maps could never do).
   - Fallback mode (no REDIS_URL): same return shape, single-node
     semantics, loud one-time warning.
   ============================================================ */

const KEY = `test-rl-${process.env.VITEST_POOL_ID ?? "x"}-${Date.now()}`;
const FB_KEY = `test-rl-fb-${Date.now()}`;
const createdKeys: string[] = [KEY];

afterAll(async () => {
  if (isRedisConfigured()) {
    const { redis, redisClose } = await import("@/lib/redis");
    const client = redis();
    await client?.del(...createdKeys).catch(() => {});
    await redisClose().catch(() => {});
  }
});

describe("consumeRateLimit (shared window)", () => {
  it("allows exactly max requests then blocks the rest", async () => {
    const results: RateResult[] = [];
    for (let i = 0; i < 5; i++) results.push(await consumeRateLimit(KEY, 3, 60_000));
    expect(results.filter((r) => r.allowed).length).toBe(3);
    expect(results.filter((r) => !r.allowed).length).toBe(2);
    expect(results[4].remaining).toBe(0);
    expect(results[4].resetAt).toBeGreaterThan(Date.now());
  });

  it("peek reports the budget without consuming a slot", async () => {
    const peekKey = `${KEY}-peek`;
    createdKeys.push(peekKey);
    await consumeRateLimit(peekKey, 2, 60_000); // 1/2 used
    const first = await peekRateLimit(peekKey, 2);
    const second = await peekRateLimit(peekKey, 2);
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1); // unchanged — peek never consumes
  });

  it("fallback mode (no REDIS_URL) honors the same contract", async () => {
    const saved = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    try {
      expect(isRedisConfigured()).toBe(false);
      const first = await consumeRateLimit(FB_KEY, 1, 60_000);
      const second = await consumeRateLimit(FB_KEY, 1, 60_000);
      expect(first.allowed).toBe(true);
      expect(second.allowed).toBe(false);
      expect(second.remaining).toBe(0);
    } finally {
      if (saved) process.env.REDIS_URL = saved;
    }
  });
});
