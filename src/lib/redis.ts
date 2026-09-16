import { log } from "@/lib/logger";

/* ============================================================
   NEXURA OS — REDIS CLIENT (shared infrastructure)
   Backs the two process-spanning layers that in-memory state
   could never serve on horizontally-scaled deployments:
     1. Rate limiting        (atomic INCR/EXPIRE fixed window)
     2. The NxEvent bus      (pub/sub fan-out to SSE subscribers)
   Jobs deliberately do NOT live here — they are durable NxJob
   rows in Postgres (src/lib/nx/jobs/runner.ts).

   Lifecycle rules:
   - NO connection at import time. `next build` module-evaluates
     route files; a connecting client at module scope would break
     or slow every build. Connections open on first use.
   - Two lazy connections: commands + a dedicated subscriber
     (ioredis requires a separate connection once SUBSCRIBE is used).
   - Dev/test without REDIS_URL: callers fall back to documented
     in-process behavior. Production: useRateLimit()/bus throw
     loudly instead of silently degrading (see src/lib/env.ts
     assertProductionEnv, which also enforces REDIS_URL at boot).
   ============================================================ */

import Redis from "ioredis";

const g = globalThis as unknown as { __nxRedis?: Redis; __nxRedisSub?: Redis };

function redisUrl(): string | undefined {
  const url = process.env.REDIS_URL;
  return url && url.startsWith("redis") ? url : undefined;
}

export function isRedisConfigured(): boolean {
  return Boolean(redisUrl());
}

/** Lazily-created shared command connection. Returns null when Redis
 *  is not configured (callers decide: fallback in dev, throw in prod). */
export function redis(): Redis | null {
  if (g.__nxRedis) return g.__nxRedis;
  const url = redisUrl();
  if (!url) return null;
  const client = new Redis(url, {
    // Bounded retry — a down Redis must surface as an error fast, not
    // queue commands behind an offline retry loop.
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    lazyConnect: false,
  });
  client.on("error", (err) => log.error("redis", "connection error", { err: err.message }));
  client.on("connect", () => log.info("redis", "connected", { url: url.replace(/:\/\/[^@]*@/, "://***@") }));
  g.__nxRedis = client;
  return client;
}

/** Lazily-created dedicated subscriber connection (pub/sub only). */
export function redisSubscriber(): Redis | null {
  if (g.__nxRedisSub) return g.__nxRedisSub;
  const url = redisUrl();
  if (!url) return null;
  const client = new Redis(url, {
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    maxRetriesPerRequest: null, // subscriber must never abort mid-stream
    enableOfflineQueue: false,
  });
  client.on("error", (err) => log.error("redis", "subscriber error", { err: err.message }));
  g.__nxRedisSub = client;
  return client;
}

/** Close both connections (tests / graceful shutdown). */
export async function redisClose(): Promise<void> {
  await Promise.allSettled([g.__nxRedis?.quit(), g.__nxRedisSub?.quit()]);
  g.__nxRedis = undefined;
  g.__nxRedisSub = undefined;
}
