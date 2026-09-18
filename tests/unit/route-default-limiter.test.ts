import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/* withRoute default limiter layering:
 *  - in-process Map pre-filter always applies (cheap, per-instance);
 *  - when REDIS_URL is configured, the authoritative shared budget is
 *    consumed from the distributed limiter (`route:` namespace) and its
 *    rejection wins with a Retry-After header;
 *  - without Redis, consumeRateLimit must never be called (the Map alone
 *    is the limit, no double-counting). */

const consumeRateLimitMock = vi.hoisted(() => vi.fn());
const isRedisConfiguredMock = vi.hoisted(() => vi.fn(() => false));

vi.mock("@/lib/redis", () => ({ isRedisConfigured: isRedisConfiguredMock }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: consumeRateLimitMock }));

import { withRoute } from "@/lib/nx/api";

function req(path = "http://localhost/api/test"): NextRequest {
  return new NextRequest(path, { method: "GET", headers: { "x-forwarded-for": "10.9.9.9" } });
}

beforeEach(() => {
  consumeRateLimitMock.mockReset();
  isRedisConfiguredMock.mockReturnValue(false);
});

describe("withRoute default limiter — distributed layer", () => {
  it("consults the distributed limiter when Redis is configured and its rejection wins with Retry-After", async () => {
    isRedisConfiguredMock.mockReturnValue(true);
    consumeRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 30_000,
    });

    const handler = withRoute(
      "test.dist-limiter-reject",
      async () => {
        throw new Error("handler must not run when the distributed limiter rejects");
      },
      { rateLimit: { max: 1000, windowMs: 60_000 } }, // pre-filter high so the distributed layer is what rejects
    );

    const res = await handler(req());
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(consumeRateLimitMock).toHaveBeenCalledTimes(1);
    expect(String(consumeRateLimitMock.mock.calls[0][0])).toMatch(
      /^route:test\.dist-limiter-reject:10\.9\.9\.9$/,
    );
  });

  it("passes through to the handler when the distributed limiter allows", async () => {
    isRedisConfiguredMock.mockReturnValue(true);
    consumeRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 999,
      resetAt: Date.now() + 60_000,
    });

    const handler = withRoute(
      "test.dist-limiter-allow",
      async () => NextResponse.json({ ok: true }),
      { rateLimit: { max: 1000, windowMs: 60_000 } },
    );

    const res = await handler(req());
    expect(res.status).toBe(200);
    expect(consumeRateLimitMock).toHaveBeenCalledTimes(1);
  });

  it("never calls the distributed limiter when Redis is not configured (no double-count)", async () => {
    const handler = withRoute(
      "test.dist-limiter-off",
      async () => NextResponse.json({ ok: true }),
      { rateLimit: { max: 1000, windowMs: 60_000 } },
    );

    const res = await handler(req());
    expect(res.status).toBe(200);
    expect(consumeRateLimitMock).not.toHaveBeenCalled();
  });
});
