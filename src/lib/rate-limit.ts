import { log } from "@/lib/logger";
import { isRedisConfigured, redis } from "@/lib/redis";

/* ============================================================
   NEXURA OS — DISTRIBUTED RATE LIMITER (Redis fixed window)
   The authoritative limit layer for the Node runtime. Replaces
   the per-process Maps that could never bound a horizontally
   scaled deployment (each instance had its own budget).

   - Atomic window: INCR + EXPIRE(NX) — the key exists only for
     one window; INCR past max is rejected.
   - Keyspaced + self-expiring: no sweeper, no memory growth.
   - Failure policy: if Redis errors mid-check we FAIL CLOSED for
     unauthenticated-sensitive callers is too blunt — instead the
     error propagates and route-level catch treats it as 503.
     Rate limiting is a security control; silently allowing all
     traffic on Redis failure would be worse.
   - Dev/test without REDIS_URL: falls back to an in-process Map
     (single-node semantics, same return shape) with a loud
     one-time warning. Production boot refuses to run without
     REDIS_URL (env validation), so the fallback cannot silently
     ship.
   ============================================================ */

export interface RateResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms when the current window resets
}

const g = globalThis as unknown as {
  __nxRlFallback?: Map<string, { count: number; resetAt: number }>;
  __nxRlWarned?: boolean;
};

function fallbackConsume(identifier: string, max: number, windowMs: number): RateResult {
  if (!g.__nxRlWarned) {
    g.__nxRlWarned = true;
    log.warn("rate-limit", "REDIS_URL not set — using in-process fallback (single-node only). Set REDIS_URL for multi-instance deployments.");
  }
  const map = (g.__nxRlFallback ??= new Map());
  const now = Date.now();
  const entry = map.get(identifier);
  if (!entry || entry.resetAt < now) {
    map.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }
  entry.count += 1;
  return { allowed: entry.count <= max, remaining: Math.max(0, max - entry.count), resetAt: entry.resetAt };
}

/** Consume one unit from `identifier`'s budget. Atomic across every
 *  app instance sharing REDIS_URL. */
export async function consumeRateLimit(
  identifier: string,
  max: number,
  windowMs: number
): Promise<RateResult> {
  if (!isRedisConfigured()) return fallbackConsume(identifier, max, windowMs);
  const client = redis();
  if (!client) return fallbackConsume(identifier, max, windowMs);

  const key = `nx:rl:${identifier}`;
  const now = Date.now();
  const count = await client.incr(key);
  if (count === 1) await client.pexpire(key, windowMs);
  const ttl = await client.pttl(key);
  const resetAt = ttl > 0 ? now + ttl : now + windowMs;
  return { allowed: count <= max, remaining: Math.max(0, max - count), resetAt };
}

/** Inspect a budget WITHOUT consuming a slot. */
export async function peekRateLimit(identifier: string, max: number): Promise<RateResult> {
  if (!isRedisConfigured()) {
    const entry = g.__nxRlFallback?.get(identifier);
    const now = Date.now();
    if (!entry || entry.resetAt < now) return { allowed: true, remaining: max, resetAt: now + 60_000 };
    return { allowed: entry.count <= max, remaining: Math.max(0, max - entry.count), resetAt: entry.resetAt };
  }
  const client = redis();
  if (!client) {
    const entry = g.__nxRlFallback?.get(identifier);
    const now = Date.now();
    if (!entry || entry.resetAt < now) return { allowed: true, remaining: max, resetAt: now + 60_000 };
    return { allowed: entry.count <= max, remaining: Math.max(0, max - entry.count), resetAt: entry.resetAt };
  }
  const key = `nx:rl:${identifier}`;
  const [count, ttl] = await Promise.all([client.get(key), client.pttl(key)]);
  const now = Date.now();
  const used = count ? Number(count) : 0;
  const resetAt = ttl && ttl > 0 ? now + ttl : now + 60_000;
  return { allowed: used < max, remaining: Math.max(0, max - used), resetAt };
}
